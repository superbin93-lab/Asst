import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { listDepartments } from "@/features/hr/queries";
import { DepartmentPanel } from "@/features/hr/department-panel";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("hr.departments");
  return { title: t("title") };
}

export default async function DepartmentsPage() {
  const user = await requirePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const [t, departments, managers] = await Promise.all([
    getTranslations("hr.departments"),
    listDepartments(),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <DepartmentPanel
        canManage={can(user, PERMISSIONS.ORG_MANAGE)}
        managers={managers}
        rows={departments.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          nameEn: d.nameEn,
          description: d.description,
          parentId: d.parentId,
          parentName: d.parent?.name ?? null,
          managerId: d.managerId,
          managerName: d.manager?.fullName ?? null,
          isActive: d.isActive,
          employeeCount: d._count.employees,
          assetCount: d._count.assets,
        }))}
      />
    </div>
  );
}
