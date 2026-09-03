import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contains, pagination, param } from "@/lib/query";
import { formatDate, formatMoney } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/config";
import { MaintenanceFilters } from "@/features/assets/maintenance-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MaintenanceStatusBadge } from "@/components/shared/status-badge";

/** Time-dependent query bounds, computed outside the component body. */
function windows() {
  const now = new Date();
  return {
    now,
    dueSoonCutoff: new Date(now.getTime() + 30 * 86_400_000),
    yearStart: new Date(now.getFullYear(), 0, 1),
  };
}

export async function generateMetadata() {
  const t = await getTranslations("assets.maintenance");
  return { title: t("title") };
}

export default async function MaintenancePage({ searchParams }: PageProps<"/assets/maintenance">) {
  await requirePermission(PERMISSIONS.ASSET_VIEW);
  const sp = await searchParams;

  const [t, tc, locale] = await Promise.all([
    getTranslations("assets.maintenance"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
  ]);

  const q = param(sp, "q");
  const status = param(sp, "status");
  const type = param(sp, "type");
  const { page, perPage, skip, take } = pagination(sp);

  const where: Prisma.AssetMaintenanceWhereInput = {
    ...(q
      ? { OR: [{ title: contains(q) }, { asset: { assetTag: contains(q) } }, { asset: { name: contains(q) } }] }
      : {}),
    ...(status ? { status: status as never } : {}),
    ...(type ? { type: type as never } : {}),
  };

  const { now, dueSoonCutoff, yearStart } = windows();

  const [rows, total, open, dueSoon, spend] = await Promise.all([
    db.assetMaintenance.findMany({
      where,
      skip,
      take,
      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        vendor: { select: { name: true } },
      },
    }),
    db.assetMaintenance.count({ where }),
    db.assetMaintenance.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    db.assetMaintenance.count({
      where: { nextDueAt: { gte: now, lte: dueSoonCutoff } },
    }),
    db.assetMaintenance.aggregate({
      _sum: { cost: true },
      where: { completedAt: { gte: yearStart } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("statuses.IN_PROGRESS")} value={open} tone="warning" />
        <StatCard label={t("nextDueAt")} value={dueSoon} tone="info" />
        <StatCard
          label={t("cost")}
          value={formatMoney(spend._sum.cost?.toString() ?? 0, "VND", locale)}
          tone="neutral"
        />
      </div>

      <MaintenanceFilters />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{tc("labels.code")}</TH>
              <TH>{tc("labels.name")}</TH>
              <TH>{t("type")}</TH>
              <TH>{tc("labels.status")}</TH>
              <TH>{t("vendor")}</TH>
              <TH>{t("scheduledAt")}</TH>
              <TH>{t("completedAt")}</TH>
              <TH className="text-right">{t("cost")}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={8} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <Link
                      href={`/assets/${row.asset.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {row.asset.assetTag}
                    </Link>
                  </TD>
                  <TD>
                    <span className="font-medium">{row.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{row.asset.name}</span>
                  </TD>
                  <TD className="text-muted-foreground">{t(`types.${row.type}`)}</TD>
                  <TD>
                    <MaintenanceStatusBadge status={row.status} />
                  </TD>
                  <TD className="text-muted-foreground">{row.vendor?.name ?? "-"}</TD>
                  <TD className="tabular">{formatDate(row.scheduledAt, locale)}</TD>
                  <TD className="tabular">{formatDate(row.completedAt, locale)}</TD>
                  <TD className="text-right tabular">
                    {formatMoney(row.cost?.toString() ?? null, row.currency, locale)}
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
