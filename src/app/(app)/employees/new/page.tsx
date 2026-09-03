import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployeeFormOptions } from "@/features/hr/queries";
import { createEmployee } from "@/features/hr/actions";
import { EmployeeForm } from "@/features/hr/employee-form";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("hr.employees");
  return { title: t("new") };
}

export default async function NewEmployeePage() {
  await requirePermission(PERMISSIONS.EMPLOYEE_CREATE);
  const [t, tc, options] = await Promise.all([
    getTranslations("hr.employees"),
    getTranslations("common.actions"),
    getEmployeeFormOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: "/employees" }, { label: t("new") }]} />
      <PageHeader title={t("new")} />
      <EmployeeForm action={createEmployee} options={options} submitLabel={tc("create")} />
    </div>
  );
}
