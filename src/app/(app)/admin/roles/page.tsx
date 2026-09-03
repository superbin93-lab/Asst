import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { RolePanel } from "@/features/admin/role-panel";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("admin.roles");
  return { title: t("title") };
}

export default async function RolesPage() {
  const user = await requirePermission(PERMISSIONS.ADMIN_ROLES);
  const [t, roles] = await Promise.all([
    getTranslations("admin.roles"),
    db.role.findMany({
      orderBy: { code: "asc" },
      include: { permissions: true, _count: { select: { users: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <RolePanel
        canManage={can(user, PERMISSIONS.ADMIN_ROLES)}
        rows={roles.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          nameEn: r.nameEn,
          description: r.description,
          isSystem: r.isSystem,
          userCount: r._count.users,
          permissions: r.permissions.map((p) => p.permission),
        }))}
      />
    </div>
  );
}
