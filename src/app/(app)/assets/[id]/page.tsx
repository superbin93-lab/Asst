import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil, Wrench } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { getAsset, getAssetFormOptions } from "@/features/assets/queries";
import { bookValue, depreciationProgress, warrantyState } from "@/features/assets/depreciation";
import { AssignAssetDialog } from "@/features/assets/assign-dialog";
import { ReturnAssetDialog } from "@/features/assets/return-dialog";
import { MaintenancePanel } from "@/features/assets/maintenance-panel";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { DescriptionItem, DescriptionList } from "@/components/shared/description-list";
import { Timeline, type TimelineEntry } from "@/components/shared/timeline";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  AssetConditionBadge,
  AssetStatusBadge,
  AssignmentStatusBadge,
} from "@/components/shared/status-badge";

export async function generateMetadata({ params }: PageProps<"/assets/[id]">) {
  const { id } = await params;
  const asset = await getAsset(id);
  return { title: asset ? `${asset.assetTag} - ${asset.name}` : "" };
}

const EVENT_TONE: Record<string, TimelineEntry["tone"]> = {
  created: "primary",
  assigned: "success",
  returned: "warning",
  disposed: "danger",
  maintenance_opened: "warning",
  maintenance_closed: "success",
};

export default async function AssetDetailPage({ params }: PageProps<"/assets/[id]">) {
  const user = await requirePermission(PERMISSIONS.ASSET_VIEW);
  const { id } = await params;

  const [t, tc, locale, settings, asset, options] = await Promise.all([
    getTranslations("assets"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    getSettings(),
    getAsset(id),
    getAssetFormOptions(),
  ]);
  if (!asset) notFound();

  const canAssign = can(user, PERMISSIONS.ASSET_ASSIGN);
  const canUpdate = can(user, PERMISSIONS.ASSET_UPDATE);
  const canMaintain = can(user, PERMISSIONS.ASSET_MAINTAIN);

  const cost = asset.purchaseCost ? Number(asset.purchaseCost) : null;
  const remaining = bookValue({
    purchaseCost: cost,
    purchaseDate: asset.purchaseDate,
    usefulLifeMonths: asset.usefulLifeMonths,
    salvageValue: asset.salvageValue ? Number(asset.salvageValue) : null,
    method: asset.depreciationMethod,
  });
  const progress = depreciationProgress({
    purchaseCost: cost,
    purchaseDate: asset.purchaseDate,
    usefulLifeMonths: asset.usefulLifeMonths,
    salvageValue: null,
    method: asset.depreciationMethod,
  });
  const warranty = warrantyState(asset.warrantyEndAt, settings.warrantyAlertDays);

  const activeAssignment = asset.assignments.find((a) => a.status === "ACTIVE");
  const specs = (asset.specs ?? null) as Record<string, unknown> | null;
  const specEntries = specs ? Object.entries(specs) : [];

  const timeline: TimelineEntry[] = asset.events.map((event) => ({
    id: event.id,
    title: `${event.type === "created" ? t("timeline.created") : event.type === "assigned" ? t("timeline.assigned", { name: event.message }) : event.type === "returned" ? t("timeline.returned", { name: event.message }) : event.type === "disposed" ? t("timeline.disposed") : event.type === "maintenance_opened" ? t("timeline.maintenanceOpened", { title: event.message }) : event.type === "maintenance_closed" ? t("timeline.maintenanceClosed", { title: event.message }) : t("timeline.updated")}`,
    meta: formatDateTime(event.createdAt, locale),
    body: event.actor?.name,
    tone: EVENT_TONE[event.type] ?? "neutral",
  }));

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: "/assets" }, { label: asset.assetTag }]} />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {asset.name}
            <AssetStatusBadge status={asset.status} />
            <AssetConditionBadge condition={asset.condition} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {asset.assetTag}
            {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
          </span>
        }
        actions={
          <>
            {canAssign && activeAssignment ? (
              <ReturnAssetDialog
                assignmentId={activeAssignment.id}
                holderName={activeAssignment.employee.fullName}
                locations={options.locations}
              />
            ) : null}
            {canAssign && !activeAssignment ? (
              <AssignAssetDialog
                assetId={asset.id}
                assetLabel={`${asset.assetTag} - ${asset.name}`}
                employees={options.employees}
                locations={options.locations}
                disabled={asset.status !== "IN_STOCK" && asset.status !== "RESERVED"}
              />
            ) : null}
            {canUpdate ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/assets/${asset.id}/edit`}>
                  <Pencil />
                  {tc("actions.edit")}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{tc("labels.overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList>
                <DescriptionItem label={t("fields.category")}>
                  {locale === "en" && asset.category.nameEn ? asset.category.nameEn : asset.category.name}
                </DescriptionItem>
                <DescriptionItem label={t("fields.model")}>{asset.model ?? "-"}</DescriptionItem>
                <DescriptionItem label={t("fields.manufacturer")}>
                  {asset.manufacturer?.name ?? "-"}
                </DescriptionItem>
                <DescriptionItem label={t("fields.supplier")}>{asset.supplier?.name ?? "-"}</DescriptionItem>
                <DescriptionItem label={t("fields.location")}>{asset.location?.name ?? "-"}</DescriptionItem>
                <DescriptionItem label={t("fields.department")}>
                  {asset.department?.name ?? "-"}
                </DescriptionItem>
                <DescriptionItem label={t("fields.invoiceNo")}>{asset.invoiceNo ?? "-"}</DescriptionItem>
                <DescriptionItem label={t("fields.poNumber")}>{asset.poNumber ?? "-"}</DescriptionItem>
                {asset.notes ? (
                  <DescriptionItem label={tc("labels.notes")} wide>
                    <span className="whitespace-pre-wrap">{asset.notes}</span>
                  </DescriptionItem>
                ) : null}
              </DescriptionList>
            </CardContent>
          </Card>

          {specEntries.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("fields.specs")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DescriptionList>
                  {specEntries.map(([key, value]) => (
                    <DescriptionItem key={key} label={key}>
                      {String(value)}
                    </DescriptionItem>
                  ))}
                </DescriptionList>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("assignment.title")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrap className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>{t("assignment.employee")}</TH>
                      <TH>{t("assignment.assignedAt")}</TH>
                      <TH>{t("assignment.returnedAt")}</TH>
                      <TH>{tc("labels.status")}</TH>
                      <TH>{t("assignment.issuedBy")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {asset.assignments.length === 0 ? (
                      <TableEmpty colSpan={5} title={tc("table.empty")} />
                    ) : (
                      asset.assignments.map((a) => (
                        <TR key={a.id}>
                          <TD>
                            <Link href={`/employees/${a.employee.id}`} className="hover:underline">
                              {a.employee.fullName}
                            </Link>
                            <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                              {a.employee.employeeCode}
                            </span>
                          </TD>
                          <TD className="tabular">{formatDate(a.assignedAt, locale)}</TD>
                          <TD className="tabular">{formatDate(a.returnedAt, locale)}</TD>
                          <TD>
                            <AssignmentStatusBadge status={a.status} />
                          </TD>
                          <TD className="text-muted-foreground">{a.issuedBy?.name ?? "-"}</TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>

          <MaintenancePanel
            assetId={asset.id}
            records={asset.maintenances.map((m) => ({
              id: m.id,
              type: m.type,
              status: m.status,
              title: m.title,
              description: m.description,
              vendorId: m.vendorId,
              vendorName: m.vendor?.name ?? null,
              cost: m.cost?.toString() ?? null,
              currency: m.currency,
              scheduledAt: m.scheduledAt,
              completedAt: m.completedAt,
              nextDueAt: m.nextDueAt,
              performedBy: m.performedBy,
            }))}
            vendors={options.vendors.map((v) => ({ id: v.id, name: v.name }))}
            canManage={canMaintain}
            locale={locale}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("fields.holder")}</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.holder ? (
                <div className="flex items-start gap-3">
                  <Avatar name={asset.holder.fullName} src={asset.holder.avatarUrl} />
                  <div className="min-w-0">
                    <Link href={`/employees/${asset.holder.id}`} className="text-sm font-medium hover:underline">
                      {asset.holder.fullName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{asset.holder.email}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[asset.holder.position?.title, asset.holder.department?.name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tc("labels.none")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("fields.purchaseCost")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DescriptionList className="sm:grid-cols-1">
                <DescriptionItem label={t("fields.purchaseDate")}>
                  {formatDate(asset.purchaseDate, locale)}
                </DescriptionItem>
                <DescriptionItem label={t("fields.purchaseCost")}>
                  <span className="tabular">{formatMoney(cost, asset.currency, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.bookValue")}>
                  <span className="tabular">{formatMoney(remaining, asset.currency, locale)}</span>
                </DescriptionItem>
              </DescriptionList>

              {progress !== null ? (
                <div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("fields.depreciationMethod")}: {t(`depreciation.${asset.depreciationMethod}`)} ·{" "}
                    {Math.round(progress * 100)}%
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("fields.warrantyEndAt")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm tabular">{formatDate(asset.warrantyEndAt, locale)}</p>
              {warranty.state === "active" ? (
                <Badge tone="success">{t("warranty.active")}</Badge>
              ) : warranty.state === "expiring" ? (
                <Badge tone="warning">{t("warranty.expiring", { days: warranty.days ?? 0 })}</Badge>
              ) : warranty.state === "expired" ? (
                <Badge tone="danger">{t("warranty.expired")}</Badge>
              ) : (
                <Badge tone="neutral">{t("warranty.unknown")}</Badge>
              )}
            </CardContent>
          </Card>

          {asset.licenseSeats.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Wrench className="mr-1.5 inline size-3.5" />
                  {asset.licenseSeats.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {asset.licenseSeats.map((seat) => (
                  <Link
                    key={seat.id}
                    href={`/licenses/${seat.license.id}`}
                    className="block text-sm hover:underline"
                  >
                    {seat.license.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("timeline.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline entries={timeline} empty={tc("table.empty")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
