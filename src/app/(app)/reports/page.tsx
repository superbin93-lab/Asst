import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/settings";
import { formatDuration, formatMoney, formatNumber } from "@/lib/format";
import { param } from "@/lib/query";
import type { AppLocale } from "@/i18n/config";
import { getReportData, resolveRange } from "@/features/dashboard/report-queries";
import { ReportPeriodFilter } from "@/features/dashboard/report-filter";
import { BarList } from "@/components/charts/bar-list";
import { TrendChart } from "@/components/charts/trend-chart";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requirePermission(PERMISSIONS.REPORT_VIEW);
  const sp = await searchParams;

  const range = resolveRange(param(sp, "period"));

  const [t, ta, tk, tl, locale, settings, data] = await Promise.all([
    getTranslations("reports"),
    getTranslations("assets"),
    getTranslations("tickets"),
    getTranslations("leave"),
    getLocale() as Promise<AppLocale>,
    getSettings(),
    getReportData(range),
  ]);

  const label = (entity: { name: string; nameEn?: string | null } | null, fallback: string) =>
    entity ? (locale === "en" && entity.nameEn ? entity.nameEn : entity.name) : fallback;

  const notSet = locale === "en" ? "Unassigned" : "Chưa gán";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={<ReportPeriodFilter />}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("assets.title")}</h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("assets.totalValue")}
            value={formatMoney(data.assets.totalValue, settings.currency, locale)}
          />
          <StatCard label={t("assets.acquiredThisPeriod")} value={data.assets.acquired} tone="success" />
          <StatCard label={t("assets.disposedThisPeriod")} value={data.assets.disposed} tone="neutral" />
          <StatCard
            label={t("assets.maintenanceCost")}
            value={formatMoney(data.assets.maintenanceCost, settings.currency, locale)}
            tone="warning"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("assets.byCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("assets.title")}
                data={data.assets.byCategory.map((row) => ({
                  key: row.key,
                  label: label(row.entity, notSet),
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("assets.byStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("assets.title")}
                data={data.assets.byStatus.map((row) => ({
                  key: row.key,
                  label: ta(`status.${row.key}` as never),
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("assets.byDepartment")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("assets.title")}
                data={data.assets.byDepartment.map((row) => ({
                  key: row.key,
                  label: label(row.entity, notSet),
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("tickets.title")}</h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("tickets.volume")} value={data.tickets.resolvedCount} />
          <StatCard
            label={t("tickets.avgResponseTime")}
            value={formatDuration(data.tickets.avgResponseMinutes, locale)}
            tone="info"
          />
          <StatCard
            label={t("tickets.avgResolutionTime")}
            value={formatDuration(data.tickets.avgResolutionMinutes, locale)}
            tone="info"
          />
          <StatCard
            label={t("tickets.slaCompliance")}
            value={`${formatNumber(data.tickets.slaCompliance, locale, 0)}%`}
            tone={data.tickets.slaCompliance >= 90 ? "success" : "warning"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("tickets.volume")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.tickets.trend}
              valueLabel={tk("singular")}
              emptyLabel={t("tickets.title")}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("tickets.byCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("tickets.title")}
                data={data.tickets.byCategory.map((row) => ({
                  key: row.key,
                  label: label(
                    data.ticketCategories.find((c) => c.id === row.key) ?? null,
                    notSet,
                  ),
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tickets.byPriority")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("tickets.title")}
                data={data.tickets.byPriority.map((row) => ({
                  key: row.key,
                  label: tk(`priority.${row.key}` as never),
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tickets.byAssignee")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("tickets.title")}
                data={data.tickets.byAssignee.map((row) => ({
                  key: row.key,
                  label: row.entity?.name ?? notSet,
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("hr.title")}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label={t("hr.newHires")} value={data.hr.newHires} tone="success" />
          <StatCard label={t("hr.terminations")} value={data.hr.leavers} tone="neutral" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.byDepartment")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={t("hr.title")}
                data={data.hr.byDepartment.map((row) => ({
                  key: row.key,
                  label: label(row.entity, notSet),
                  value: row.value,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("leave.byType")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                locale={locale}
                emptyLabel={tl("title")}
                fractionDigits={1}
                data={data.leave.byType.map((row) => ({
                  key: row.key,
                  label: label(row.entity, notSet),
                  value: row.value,
                  color: row.color,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
