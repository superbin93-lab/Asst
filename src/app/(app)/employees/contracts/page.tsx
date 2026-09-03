import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/config";
import { listContracts } from "@/features/hr/queries";
import { ContractPanel } from "@/features/hr/contract-panel";
import { ContractFilters } from "@/features/hr/contract-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";

export async function generateMetadata() {
  const t = await getTranslations("hr.contracts");
  return { title: t("title") };
}

export default async function ContractsPage({ searchParams }: PageProps<"/employees/contracts">) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const sp = await searchParams;

  const [t, locale, { rows, total, page, perPage }, employees] = await Promise.all([
    getTranslations("hr.contracts"),
    getLocale() as Promise<AppLocale>,
    listContracts(sp),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <ContractFilters />
      <ContractPanel
        locale={locale}
        employees={employees}
        canManage={can(user, PERMISSIONS.EMPLOYEE_UPDATE)}
        canSeeSalary={can(user, PERMISSIONS.EMPLOYEE_SALARY_VIEW)}
        rows={rows.map((c) => ({
          id: c.id,
          label: c.contractNo,
          contractNo: c.contractNo,
          employeeId: c.employeeId,
          employeeName: c.employee.fullName,
          type: c.type,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          signedAt: c.signedAt,
          baseSalary: c.baseSalary?.toString() ?? null,
          currency: c.currency,
          notes: c.notes,
        }))}
      />
      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
