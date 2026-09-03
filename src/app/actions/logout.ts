"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, destroySession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

export async function logout() {
  const user = await getCurrentUser();
  if (user) {
    await recordAudit({ action: "LOGOUT", entityType: "User", entityId: user.id, userId: user.id, summary: user.email });
  }
  await destroySession();
  redirect("/login");
}
