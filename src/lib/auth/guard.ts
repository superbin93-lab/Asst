import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Permission } from "./permissions";

/** Thrown by server actions when the caller lacks a required permission. */
export class ForbiddenError extends Error {
  constructor(public readonly permission?: Permission) {
    super("forbidden");
    this.name = "ForbiddenError";
  }
}

/** For pages/layouts: sends anonymous visitors to the login screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: 403s the render when the permission is missing. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/forbidden");
  return user;
}

/** For server actions: throws instead of redirecting so the form can show an error. */
export async function authorize(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError(permission);
  if (!can(user, permission)) throw new ForbiddenError(permission);
  return user;
}

export async function authorizeSession(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  return user;
}
