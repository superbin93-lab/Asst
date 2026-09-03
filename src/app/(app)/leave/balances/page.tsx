import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { listBalances } from "@/features/leave/queries";
import { AdjustBalanceButton, GenerateBalancesButton } from "@/features/leave/balance-panel";
import { BalanceFilters } from "@/features/leave/balance-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export async function generateMetadata() {
  const t = await getTranslations("leave.balance");
  return { title: t("title") };
}

export default async function LeaveBalancesPage({ searchParams }: PageProps<"/leave/balances">) {
  await requirePermission(PERMISSIONS.LEAVE_MANAGE);
  const sp = await searchParams;

  const [t, tc, locale, { employees, total, page, perPage, year }, types, departments] = await Promise.all([
    getTranslations("leave"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    listBalances(sp),
    db.leaveType.findMany({
      where: { isActive: true, deductsBalance: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, nameEn: true },
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameEn: true },
    }),
  ]);

  const label = (x: { name: string; nameEn: string | null }) =>
    locale === "en" && x.nameEn ? x.nameEn : x.name;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("balance.title")}
        description={`${t("balance.year")}: ${year}`}
        actions={<GenerateBalancesButton year={year} />}
      />

      <BalanceFilters departments={departments.map((d) => ({ value: d.id, label: label(d) }))} />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH className="sticky left-0 bg-surface-muted">{t("fields.employee")}</TH>
              <TH>{tc("labels.department")}</TH>
              {types.map((type) => (
                <TH key={type.id} className="text-center">
                  {label(type)}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {employees.length === 0 ? (
              <TableEmpty colSpan={types.length + 2} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              employees.map((employee) => (
                <TR key={employee.id}>
                  <TD className="sticky left-0 bg-surface">
                    <Link href={`/employees/${employee.id}`} className="font-medium hover:underline">
                      {employee.fullName}
                    </Link>
                    <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                      {employee.employeeCode}
                    </span>
                  </TD>
                  <TD className="text-muted-foreground">{employee.department?.name ?? "-"}</TD>

                  {types.map((type) => {
                    const balance = employee.leaveBalances.find((b) => b.leaveTypeId === type.id);
                    if (!balance) {
                      return (
                        <TD key={type.id} className="text-center text-muted-foreground">
                          -
                        </TD>
                      );
                    }
                    const totalAvailable =
                      balance.entitledDays + balance.carriedOverDays + balance.adjustmentDays;
                    const remaining = totalAvailable - balance.usedDays - balance.pendingDays;

                    return (
                      <TD key={type.id} className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="tabular">
                            <strong>{formatNumber(remaining, locale, 1)}</strong>
                            <span className="text-muted-foreground">
                              /{formatNumber(totalAvailable, locale, 1)}
                            </span>
                          </span>
                          <AdjustBalanceButton
                            balanceId={balance.id}
                            employeeName={employee.fullName}
                            typeName={label(type)}
                            adjustmentDays={balance.adjustmentDays}
                            note={balance.note}
                          />
                        </span>
                      </TD>
                    );
                  })}
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
