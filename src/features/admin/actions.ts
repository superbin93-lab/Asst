"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize, authorizeSession } from "@/lib/auth/guard";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { hashPassword, passwordIssues, verifyPassword } from "@/lib/auth/password";
import { saveSettings, settingsSchema } from "@/lib/settings";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import { optionalId, optionalString } from "@/features/assets/schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

const userSchema = z.object({
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  email: z.string().trim().toLowerCase().email("invalidEmail"),
  password: optionalString,
  employeeId: optionalId,
  locale: z.enum(["vi", "en"]).default("vi"),
  isActive: checkbox,
  isSuperAdmin: checkbox,
  roleIds: optionalString,
});

const roleSchema = z.object({
  code: z.string().trim().min(2, "required").max(32, "maxLength").regex(/^[A-Z0-9_]+$/, "codeFormat"),
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  nameEn: optionalString,
  description: optionalString,
  permissions: optionalString,
});

const parseIdList = (value: string | undefined) =>
  (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);

export async function saveUser(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.ADMIN_USERS);
    const parsed = userSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const roleIds = parseIdList(input.roleIds);

    const clash = await db.user.findUnique({ where: { email: input.email } });
    if (clash && clash.id !== id) return fail("validation", { email: "duplicate" });

    if (!id && !input.password) return fail("validation", { password: "required" });
    if (input.password) {
      const issues = passwordIssues(input.password);
      if (issues.length > 0) return fail("validation", { password: issues[0] });
    }
    // Locking yourself out of the admin screens is never the intent.
    if (id === actor.id && !input.isActive) return fail("cannotDisableSelf");

    if (input.employeeId) {
      const taken = await db.user.findUnique({ where: { employeeId: input.employeeId } });
      if (taken && taken.id !== id) return fail("validation", { employeeId: "duplicate" });
    }

    const data = {
      name: input.name,
      email: input.email,
      employeeId: input.employeeId ?? null,
      locale: input.locale,
      isActive: input.isActive,
      isSuperAdmin: actor.isSuperAdmin ? input.isSuperAdmin : undefined,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    };

    const user = id
      ? await db.user.update({ where: { id }, data })
      : await db.user.create({ data: { ...data, passwordHash: await hashPassword(input.password!) } });

    await db.userRole.deleteMany({ where: { userId: user.id, roleId: { notIn: roleIds } } });
    for (const roleId of roleIds) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        create: { userId: user.id, roleId },
        update: {},
      });
    }

    // Revoke live sessions when an account is disabled.
    if (!input.isActive) await db.session.deleteMany({ where: { userId: user.id } });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "User", entityId: user.id,
      userId: actor.id, summary: user.email,
    });

    revalidatePath("/admin/users");
    return ok({ id: user.id });
  });
}

export async function resetUserPassword(id: string): Promise<ActionResult<{ password: string }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.ADMIN_USERS);
    const user = await db.user.findUnique({ where: { id }, select: { email: true } });
    if (!user) return fail("notFound");

    // Readable but high-entropy: 16 base64url chars plus a fixed complexity tail.
    const password = `${randomBytes(9).toString("base64url")}Aa1`;
    await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
    await db.session.deleteMany({ where: { userId: id } });

    await recordAudit({
      action: "UPDATE", entityType: "User", entityId: id, userId: actor.id,
      summary: `Password reset for ${user.email}`,
    });

    revalidatePath("/admin/users");
    return ok({ password });
  });
}

export async function deleteUser(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.ADMIN_USERS);
    if (id === actor.id) return fail("cannotDisableSelf");

    const user = await db.user.findUnique({ where: { id }, select: { email: true } });
    if (!user) return fail("notFound");

    await db.user.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "User", entityId: id, userId: actor.id, summary: user.email });

    revalidatePath("/admin/users");
    return ok(undefined);
  });
}

export async function saveRole(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.ADMIN_ROLES);
    const parsed = roleSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const permissions = parseIdList(input.permissions).filter((p) =>
      (ALL_PERMISSIONS as string[]).includes(p),
    );

    const clash = await db.role.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const role = id
      ? await db.role.update({
          where: { id },
          data: { name: input.name, nameEn: input.nameEn, description: input.description },
        })
      : await db.role.create({
          data: { code: input.code, name: input.name, nameEn: input.nameEn, description: input.description },
        });

    await db.rolePermission.deleteMany({ where: { roleId: role.id, permission: { notIn: permissions } } });
    for (const permission of permissions) {
      await db.rolePermission.upsert({
        where: { roleId_permission: { roleId: role.id, permission } },
        create: { roleId: role.id, permission },
        update: {},
      });
    }

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Role", entityId: role.id,
      userId: actor.id, summary: `${role.code} (${permissions.length} permissions)`,
    });

    revalidatePath("/admin/roles");
    return ok({ id: role.id });
  });
}

export async function deleteRole(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.ADMIN_ROLES);
    const role = await db.role.findUnique({
      where: { id },
      select: { code: true, isSystem: true, _count: { select: { users: true } } },
    });
    if (!role) return fail("notFound");
    if (role.isSystem) return fail("systemRole");
    if (role._count.users > 0) return fail("cannotDeleteInUse");

    await db.role.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "Role", entityId: id, userId: actor.id, summary: role.code });

    revalidatePath("/admin/roles");
    return ok(undefined);
  });
}

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.ADMIN_SETTINGS);
    const raw = objectFromForm(formData);

    const workweek = formData
      .getAll("workweek")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);

    const parsed = settingsSchema.partial().safeParse({
      ...raw,
      workweek: workweek.length > 0 ? workweek : undefined,
      approvalLevels: raw.approvalLevels ? Number(raw.approvalLevels) : undefined,
      warrantyAlertDays: raw.warrantyAlertDays ? Number(raw.warrantyAlertDays) : undefined,
      licenseAlertDays: raw.licenseAlertDays ? Number(raw.licenseAlertDays) : undefined,
    });
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    await saveSettings(parsed.data);
    await recordAudit({
      action: "UPDATE", entityType: "Setting", entityId: "app", userId: actor.id, summary: "System settings",
    });

    revalidatePath("/", "layout");
    return ok(undefined);
  });
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "required"),
    newPassword: z.string().min(1, "required"),
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await authorizeSession();
    const parsed = changePasswordSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { currentPassword, newPassword } = parsed.data;
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return fail("validation", { currentPassword: "wrongCurrentPassword" });
    }
    const issues = passwordIssues(newPassword);
    if (issues.length > 0) return fail("validation", { newPassword: issues[0] });

    await db.user.update({ where: { id: actor.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await recordAudit({
      action: "UPDATE", entityType: "User", entityId: actor.id, userId: actor.id, summary: "Password changed",
    });

    revalidatePath("/profile");
    return ok(undefined);
  });
}
