import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { Locale } from "@/generated/prisma/enums";
import type { PermissionSet } from "./permissions";

export const SESSION_COOKIE = "itam_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: Locale;
  isSuperAdmin: boolean;
  employeeId: string | null;
  departmentId: string | null;
  roleCodes: string[];
  permissions: PermissionSet;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Issues an opaque session token. Only its SHA-256 digest is stored, so a leaked
 * database dump cannot be replayed against the app.
 */
export async function createSession(userId: string, meta: { ip?: string; userAgent?: string } = {}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE_DAYS * 86_400_000);

  await db.session.create({
    data: { userId, tokenHash: hash(token), expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user for the current request. Memoised per request so
 * layouts, pages and server actions share one query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: {
      user: {
        include: {
          employee: { select: { id: true, departmentId: true } },
          roles: { include: { role: { include: { permissions: true } } } },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

  const { user } = session;
  const permissions = new Set<string>();
  for (const link of user.roles) {
    for (const p of link.role.permissions) permissions.add(p.permission);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    isSuperAdmin: user.isSuperAdmin,
    employeeId: user.employee?.id ?? null,
    departmentId: user.employee?.departmentId ?? null,
    roleCodes: user.roles.map((r) => r.role.code),
    permissions,
  };
});
