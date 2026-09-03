import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { listAssets, getAssetFormOptions, getAssetStats } from "@/features/assets/queries";
import { warrantyState } from "@/features/assets/depreciation";
import { ASSET_STATUSES } from "@/features/assets/schema";
import { AssetFilters } from "@/features/assets/asset-filters";
import { AssetRowActions } from "@/features/assets/asset-row-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { SortHeader } from "@/components/shared/sort-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AssetConditionBadge, AssetStatusBadge } from "@/components/shared/status-badge";

export async function generateMetadata() {
  const t = await getTranslations("assets");
  return { title: t("title") };
}

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const user = await requirePermission(PERMISSIONS.ASSET_VIEW);
  const sp = await searchParams;

  const [t, tc, locale, settings, { rows, total, page, perPage }, options, stats] = await Promise.all([
    getTranslations("assets"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    getSettings(),
    listAssets(sp),
    getAssetFormOptions(),
    getAssetStats(),
  ]);

  const canCreate = can(user, PERMISSIONS.ASSET_CREATE);
  const canAssign = can(user, PERMISSIONS.ASSET_ASSIGN);
  const canUpdate = can(user, PERMISSIONS.ASSET_UPDATE);
  const canDelete = can(user, PERMISSIONS.ASSET_DELETE);

  const categoryLabel = (c: { name: string; nameEn: string | null }) =>
    locale === "en" && c.nameEn ? c.nameEn : c.name;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/assets/new">
                <Plus />
                {t("new")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("title")} value={stats.total} href="/assets" />
        <StatCard
          label={t("status.ASSIGNED")}
          value={stats.assigned}
          tone="success"
          href="/assets?status=ASSIGNED"
        />
        <StatCard label={t("status.IN_STOCK")} value={stats.inStock} tone="info" href="/assets?status=IN_STOCK" />
        <StatCard
          label={t("filters.warrantyExpiring")}
          value={stats.warrantyExpiring}
          tone="warning"
          href="/assets?warranty=expiring"
        />
      </div>

      <AssetFilters
        categories={options.categories.map((c) => ({ value: c.id, label: categoryLabel(c) }))}
        locations={options.locations.map((l) => ({ value: l.id, label: `${l.code} - ${l.name}` }))}
        statuses={ASSET_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
      />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>
                <SortHeader field="assetTag" label={t("fields.assetTag")} />
              </TH>
              <TH>
                <SortHeader field="name" label={t("fields.name")} />
              </TH>
              <TH>{t("fields.category")}</TH>
              <TH>
                <SortHeader field="status" label={t("fields.status")} />
              </TH>
              <TH>{t("fields.condition")}</TH>
              <TH>{t("fields.holder")}</TH>
              <TH>{t("fields.location")}</TH>
              <TH className="text-right">{t("fields.purchaseCost")}</TH>
              <TH>
                <SortHeader field="warrantyEndAt" label={t("fields.warrantyEndAt")} />
              </TH>
              <TH className="w-10 text-right">{tc("labels.actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={10} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((asset) => {
                const warranty = warrantyState(asset.warrantyEndAt, settings.warrantyAlertDays);
                return (
                  <TR key={asset.id}>
                    <TD>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {asset.assetTag}
                      </Link>
                    </TD>
                    <TD>
                      <Link href={`/assets/${asset.id}`} className="font-medium hover:underline">
                        {asset.name}
                      </Link>
                      {asset.serialNumber ? (
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                          {asset.serialNumber}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="text-muted-foreground">{categoryLabel(asset.category)}</TD>
                    <TD>
                      <AssetStatusBadge status={asset.status} />
                    </TD>
                    <TD>
                      <AssetConditionBadge condition={asset.condition} />
                    </TD>
                    <TD>
                      {asset.holder ? (
                        <Link href={`/employees/${asset.holder.id}`} className="hover:underline">
                          {asset.holder.fullName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TD>
                    <TD className="text-muted-foreground">{asset.location?.name ?? "-"}</TD>
                    <TD className="text-right tabular">
                      {formatMoney(asset.purchaseCost?.toString() ?? null, asset.currency, locale)}
                    </TD>
                    <TD>
                      {warranty.state === "unknown" ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="tabular text-xs">{formatDate(asset.warrantyEndAt, locale)}</span>
                          {warranty.state === "expired" ? (
                            <Badge tone="danger">{t("warranty.expired")}</Badge>
                          ) : warranty.state === "expiring" ? (
                            <Badge tone="warning">{t("warranty.expiring", { days: warranty.days ?? 0 })}</Badge>
                          ) : null}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right">
                      <AssetRowActions
                        assetId={asset.id}
                        assetTag={asset.assetTag}
                        assetName={asset.name}
                        status={asset.status}
                        canAssign={canAssign}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                      />
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
