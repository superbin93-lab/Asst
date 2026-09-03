import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/config";
import { UserPanel } from "@/features/admin/user-panel";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("admin.users");
  return { title: t("title") };
}

export default async function UsersPage() {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  const [t, locale, users, roles, employees] = await Promise.all([
    getTranslations("admin.users"),
    getLocale() as Promise<AppLocale>,
    db.user.findMany({
      orderBy: { name: "asc" },
      include: {
        employee: { select: { id: true, fullName: true } },
        roles: { include: { role: { select: { id: true, name: true } } } },
      },
    }),
    db.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <UserPanel
        locale={locale}
        roles={roles}
        employees={employees}
        canManage={can(user, PERMISSIONS.ADMIN_USERS)}
        isSuperAdmin={user.isSuperAdmin}
        currentUserId={user.id}
        rows={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          locale: u.locale,
          isActive: u.isActive,
          isSuperAdmin: u.isSuperAdmin,
          lastLoginAt: u.lastLoginAt,
          employeeId: u.employeeId,
          employeeName: u.employee?.fullName ?? null,
          roleIds: u.roles.map((r) => r.role.id),
          roleNames: u.roles.map((r) => r.role.name),
        }))}
      />
    </div>
  );
}
