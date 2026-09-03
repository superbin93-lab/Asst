"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { LOCALE_COOKIE } from "@/i18n/config";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

export type LoginState = { error?: "invalidCredentials" | "accountDisabled" | "invalidInput" };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });
  if (!parsed.success) return { error: "invalidInput" };

  const { email, password, redirectTo } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Compare against a dummy hash when the account is missing so the response
  // time does not reveal whether the email exists.
  const hash = user?.passwordHash ?? "$2a$12$0000000000000000000000000000000000000000000000000000";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) return { error: "invalidCredentials" };
  if (!user.isActive) return { error: "accountDisabled" };

  const h = await headers();
  await createSession(user.id, {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  });

  const store = await cookies();
  store.set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({ action: "LOGIN", entityType: "User", entityId: user.id, userId: user.id, summary: user.email });

  const target = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  redirect(target);
}
