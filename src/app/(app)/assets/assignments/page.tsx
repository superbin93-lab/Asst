import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contains, pagination, param } from "@/lib/query";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/config";
import { AssignmentFilters } from "@/features/assets/assignment-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AssetConditionBadge, AssignmentStatusBadge } from "@/components/shared/status-badge";

/** Kept outside the component so the clock read is not part of render. */
function isOverdue(status: string, expectedReturnAt: Date | null): boolean {
  return status === "ACTIVE" && expectedReturnAt !== null && expectedReturnAt.getTime() < Date.now();
}

export async function generateMetadata() {
  const t = await getTranslations("assets.assignment");
  return { title: t("title") };
}

export default async function AssignmentsPage({ searchParams }: PageProps<"/assets/assignments">) {
  await requirePermission(PERMISSIONS.ASSET_VIEW);
  const sp = await searchParams;

  const [t, tc, locale] = await Promise.all([
    getTranslations("assets"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
  ]);

  const q = param(sp, "q");
  const status = param(sp, "status");
  const departmentId = param(sp, "department");
  const { page, perPage, skip, take } = pagination(sp);

  const where: Prisma.AssetAssignmentWhereInput = {
    ...(q
      ? {
          OR: [
            { asset: { assetTag: contains(q) } },
            { asset: { name: contains(q) } },
            { employee: { fullName: contains(q) } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
    ...(departmentId ? { employee: { departmentId } } : {}),
  };

  const [rows, total, departments] = await Promise.all([
    db.assetAssignment.findMany({
      where,
      skip,
      take,
      orderBy: { assignedAt: "desc" },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        employee: {
          select: {
            id: true, fullName: true, employeeCode: true, avatarUrl: true,
            department: { select: { name: true } },
          },
        },
        issuedBy: { select: { name: true } },
      },
    }),
    db.assetAssignment.count({ where }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("assignment.title")} description={t("subtitle")} />

      <AssignmentFilters departments={departments.map((d) => ({ value: d.id, label: d.name }))} />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{t("fields.assetTag")}</TH>
              <TH>{t("fields.name")}</TH>
              <TH>{t("assignment.employee")}</TH>
              <TH>{t("assignment.assignedAt")}</TH>
              <TH>{t("assignment.expectedReturnAt")}</TH>
              <TH>{t("assignment.returnedAt")}</TH>
              <TH>{t("assignment.conditionOut")}</TH>
              <TH>{tc("labels.status")}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={8} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((row) => {
                const overdue = isOverdue(row.status, row.expectedReturnAt);
                return (
                  <TR key={row.id}>
                    <TD>
                      <Link
                        href={`/assets/${row.asset.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.asset.assetTag}
                      </Link>
                    </TD>
                    <TD className="font-medium">{row.asset.name}</TD>
                    <TD>
                      <span className="flex items-center gap-2">
                        <Avatar name={row.employee.fullName} src={row.employee.avatarUrl} size="sm" />
                        <span className="min-w-0">
                          <Link
                            href={`/employees/${row.employee.id}`}
                            className="block truncate hover:underline"
                          >
                            {row.employee.fullName}
                          </Link>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {row.employee.department?.name ?? row.employee.employeeCode}
                          </span>
                        </span>
                      </span>
                    </TD>
                    <TD className="tabular">{formatDate(row.assignedAt, locale)}</TD>
                    <TD className="tabular">
                      <span className="flex items-center gap-2">
                        {formatDate(row.expectedReturnAt, locale)}
                        {overdue ? <Badge tone="danger">{t("assignment.status.OVERDUE")}</Badge> : null}
                      </span>
                    </TD>
                    <TD className="tabular">{formatDate(row.returnedAt, locale)}</TD>
                    <TD>
                      {row.conditionOut ? <AssetConditionBadge condition={row.conditionOut} /> : "-"}
                    </TD>
                    <TD>
                      <AssignmentStatusBadge status={row.status} />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </TableWrap>

      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
