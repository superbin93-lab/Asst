import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { daysBetween } from "@/lib/utils";
import type { AppLocale } from "@/i18n/config";
import { getEmployee } from "@/features/hr/queries";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { DescriptionItem, DescriptionList } from "@/components/shared/description-list";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  AssetStatusBadge,
  ContractStatusBadge,
  EmployeeStatusBadge,
  LeaveStatusBadge,
  TicketStatusBadge,
} from "@/components/shared/status-badge";

export async function generateMetadata({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  const employee = await getEmployee(id);
  return { title: employee?.fullName ?? "" };
}

export default async function EmployeeDetailPage({ params }: PageProps<"/employees/[id]">) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const { id } = await params;

  const [t, tc, tl, locale, employee] = await Promise.all([
    getTranslations("hr"),
    getTranslations("common"),
    getTranslations("leave"),
    getLocale() as Promise<AppLocale>,
    getEmployee(id),
  ]);
  if (!employee) notFound();

  const canUpdate = can(user, PERMISSIONS.EMPLOYEE_UPDATE);
  const canSeeSalary = can(user, PERMISSIONS.EMPLOYEE_SALARY_VIEW);

  const tenureDays = daysBetween(employee.hireDate, employee.terminationDate ?? new Date());
  const tenureYears = Math.floor(tenureDays / 365);
  const tenureMonths = Math.floor((tenureDays % 365) / 30);

  const label = (x: { name: string; nameEn: string | null } | null) =>
    x ? (locale === "en" && x.nameEn ? x.nameEn : x.name) : "-";

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[{ label: t("employees.title"), href: "/employees" }, { label: employee.fullName }]}
      />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {employee.fullName}
            <EmployeeStatusBadge status={employee.status} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {employee.employeeCode} · {employee.email}
          </span>
        }
        actions={
          canUpdate ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/employees/${employee.id}/edit`}>
                <Pencil />
                {tc("actions.edit")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("employees.tabs.profile")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList>
                <DescriptionItem label={t("employees.fields.department")}>
                  {label(employee.department)}
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.position")}>
                  {employee.position
                    ? locale === "en" && employee.position.titleEn
                      ? employee.position.titleEn
                      : employee.position.title
                    : "-"}
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.manager")}>
                  {employee.manager ? (
                    <Link href={`/employees/${employee.manager.id}`} className="hover:underline">
                      {employee.manager.fullName}
                    </Link>
                  ) : (
                    "-"
                  )}
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.location")}>
                  {employee.location?.name ?? "-"}
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.employmentType")}>
                  {t(`employees.employmentType.${employee.employmentType}`)}
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.hireDate")}>
                  <span className="tabular">{formatDate(employee.hireDate, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.tenure")}>
                  {tenureYears > 0 ? `${tenureYears}y ` : ""}
                  {tenureMonths}m
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.probationEndDate")}>
                  <span className="tabular">{formatDate(employee.probationEndDate, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.phone")}>{employee.phone ?? "-"}</DescriptionItem>
                <DescriptionItem label={t("employees.fields.dateOfBirth")}>
                  <span className="tabular">{formatDate(employee.dateOfBirth, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("employees.fields.address")} wide>
                  {employee.address ?? "-"}
                </DescriptionItem>
                {employee.emergencyContact ? (
                  <DescriptionItem label={t("employees.fields.emergencyContact")} wide>
                    {employee.emergencyContact}
                    {employee.emergencyPhone ? ` · ${employee.emergencyPhone}` : ""}
                  </DescriptionItem>
                ) : null}
              </DescriptionList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("employees.tabs.assets")}</CardTitle>
              <Badge tone="neutral">{employee.assetsHeld.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrap className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>{tc("labels.code")}</TH>
                      <TH>{tc("labels.name")}</TH>
                      <TH>{tc("labels.status")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {employee.assetsHeld.length === 0 ? (
                      <TableEmpty colSpan={3} title={tc("table.empty")} />
                    ) : (
                      employee.assetsHeld.map((asset) => (
                        <TR key={asset.id}>
                          <TD>
                            <Link
                              href={`/assets/${asset.id}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {asset.assetTag}
                            </Link>
                          </TD>
                          <TD>
                            {asset.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {label(asset.category)}
                            </span>
                          </TD>
                          <TD>
                            <AssetStatusBadge status={asset.status} />
                          </TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("contracts.title")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrap className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>{t("contracts.contractNo")}</TH>
                      <TH>{t("contracts.type")}</TH>
                      <TH>{t("contracts.startDate")}</TH>
                      <TH>{t("contracts.endDate")}</TH>
                      {canSeeSalary ? <TH className="text-right">{t("contracts.baseSalary")}</TH> : null}
                      <TH>{tc("labels.status")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {employee.contracts.length === 0 ? (
                      <TableEmpty colSpan={canSeeSalary ? 6 : 5} title={tc("table.empty")} />
                    ) : (
                      employee.contracts.map((contract) => (
                        <TR key={contract.id}>
                          <TD className="font-mono text-xs">{contract.contractNo}</TD>
                          <TD>{t(`contracts.types.${contract.type}`)}</TD>
                          <TD className="tabular">{formatDate(contract.startDate, locale)}</TD>
                          <TD className="tabular">{formatDate(contract.endDate, locale)}</TD>
                          {canSeeSalary ? (
                            <TD className="text-right tabular">
                              {formatMoney(contract.baseSalary?.toString() ?? null, contract.currency, locale)}
                            </TD>
                          ) : null}
                          <TD>
                            <ContractStatusBadge status={contract.status} />
                          </TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("employees.tabs.tickets")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrap className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>{tc("labels.code")}</TH>
                      <TH>{tc("labels.name")}</TH>
                      <TH>{tc("labels.status")}</TH>
                      <TH>{tc("labels.createdAt")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {employee.requestedTickets.length === 0 ? (
                      <TableEmpty colSpan={4} title={tc("table.empty")} />
                    ) : (
                      employee.requestedTickets.map((ticket) => (
                        <TR key={ticket.id}>
                          <TD>
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {ticket.code}
                            </Link>
                          </TD>
                          <TD className="max-w-sm truncate">{ticket.title}</TD>
                          <TD>
                            <TicketStatusBadge status={ticket.status} />
                          </TD>
                          <TD className="tabular text-xs text-muted-foreground">
                            {formatDate(ticket.createdAt, locale)}
                          </TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 py-5">
              <Avatar name={employee.fullName} src={employee.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{employee.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{employee.email}</p>
                {employee.user ? (
                  <Badge tone={employee.user.isActive ? "success" : "neutral"} className="mt-2">
                    {employee.user.email}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tl("balance.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {employee.leaveBalances.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tc("table.empty")}</p>
              ) : (
                employee.leaveBalances.map((balance) => {
                  const totalAvailable =
                    balance.entitledDays + balance.carriedOverDays + balance.adjustmentDays;
                  const remaining = totalAvailable - balance.usedDays - balance.pendingDays;
                  return (
                    <div key={balance.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: balance.leaveType.color }}
                          aria-hidden
                        />
                        <span className="truncate">{label(balance.leaveType)}</span>
                      </span>
                      <span className="shrink-0 tabular">
                        <strong>{formatNumber(remaining, locale, 1)}</strong>
                        <span className="text-muted-foreground">
                          /{formatNumber(totalAvailable, locale, 1)}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tl("title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {employee.leaveRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tc("table.empty")}</p>
              ) : (
                employee.leaveRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/leave/${request.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{label(request.leaveType)}</span>
                      <span className="block text-[11px] text-muted-foreground tabular">
                        {formatDate(request.startDate, locale)} - {formatDate(request.endDate, locale)}
                      </span>
                    </span>
                    <LeaveStatusBadge status={request.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {employee.reports.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("employees.fields.manager")}</CardTitle>
                <Badge tone="neutral">{employee.reports.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {employee.reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/employees/${report.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted"
                  >
                    <Avatar name={report.fullName} src={report.avatarUrl} size="sm" />
                    <span className="truncate">{report.fullName}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
