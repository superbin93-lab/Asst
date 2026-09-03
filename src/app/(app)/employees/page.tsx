import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { getEmployeeFormOptions, getHrStats, listEmployees } from "@/features/hr/queries";
import { EmployeeFilters } from "@/features/hr/employee-filters";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { SortHeader } from "@/components/shared/sort-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmployeeStatusBadge } from "@/components/shared/status-badge";

export async function generateMetadata() {
  const t = await getTranslations("hr.employees");
  return { title: t("title") };
}

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const sp = await searchParams;

  const [t, tc, locale, { rows, total, page, perPage }, options, stats] = await Promise.all([
    getTranslations("hr.employees"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    listEmployees(sp),
    getEmployeeFormOptions(),
    getHrStats(),
  ]);

  const canCreate = can(user, PERMISSIONS.EMPLOYEE_CREATE);
  const deptLabel = (d: { name: string; nameEn: string | null } | null) =>
    d ? (locale === "en" && d.nameEn ? d.nameEn : d.name) : "-";
  const posLabel = (p: { title: string; titleEn: string | null } | null) =>
    p ? (locale === "en" && p.titleEn ? p.titleEn : p.title) : "-";

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/employees/new">
                <Plus />
                {t("new")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("title")} value={stats.headcount} />
        <StatCard label={t("status.PROBATION")} value={stats.probation} tone="info" href="/employees?status=PROBATION" />
        <StatCard label={t("fields.hireDate")} value={stats.newThisMonth} tone="success" />
        <StatCard
          label={t("employmentType.FULL_TIME")}
          value={stats.byType.FULL_TIME ?? 0}
          href="/employees?type=FULL_TIME"
        />
      </div>

      <EmployeeFilters
        departments={options.departments.map((d) => ({ value: d.id, label: deptLabel(d) }))}
        positions={options.positions.map((p) => ({ value: p.id, label: posLabel(p) }))}
      />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>
                <SortHeader field="employeeCode" label={t("fields.employeeCode")} />
              </TH>
              <TH>
                <SortHeader field="fullName" label={t("fields.fullName")} />
              </TH>
              <TH>{t("fields.department")}</TH>
              <TH>{t("fields.position")}</TH>
              <TH>{t("fields.manager")}</TH>
              <TH>
                <SortHeader field="hireDate" label={t("fields.hireDate")} />
              </TH>
              <TH className="text-right">{tc("labels.total")}</TH>
              <TH>
                <SortHeader field="status" label={t("fields.status")} />
              </TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={8} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((employee) => (
                <TR key={employee.id}>
                  <TD className="font-mono text-xs">{employee.employeeCode}</TD>
                  <TD>
                    <span className="flex items-center gap-2">
                      <Avatar name={employee.fullName} src={employee.avatarUrl} size="sm" />
                      <span className="min-w-0">
                        <Link href={`/employees/${employee.id}`} className="block font-medium hover:underline">
                          {employee.fullName}
                        </Link>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {employee.email}
                        </span>
                      </span>
                    </span>
                  </TD>
                  <TD className="text-muted-foreground">{deptLabel(employee.department)}</TD>
                  <TD className="text-muted-foreground">{posLabel(employee.position)}</TD>
                  <TD className="text-muted-foreground">{employee.manager?.fullName ?? "-"}</TD>
                  <TD className="tabular">{formatDate(employee.hireDate, locale)}</TD>
                  <TD className="text-right tabular">{employee._count.assetsHeld}</TD>
                  <TD>
                    <EmployeeStatusBadge status={employee.status} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>

      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
