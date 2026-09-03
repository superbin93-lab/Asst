import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AlertTriangle, CalendarClock, HardDrive, LifeBuoy, PackageCheck, ShieldCheck, Users, Wrench,
} from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { getDashboardData } from "@/features/dashboard/queries";
import { BarList } from "@/components/charts/bar-list";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/shared/status-badge";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [t, tc, ta, tk, tl, locale, data] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getTranslations("assets"),
    getTranslations("tickets"),
    getTranslations("leave"),
    getLocale() as Promise<AppLocale>,
    getDashboardData(user),
  ]);

  const { permissions: p } = data;
  const label = (x: { name: string; nameEn: string | null }) =>
    locale === "en" && x.nameEn ? x.nameEn : x.name;

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("greeting", { name: user.name })} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {p.seesAssets ? (
          <>
            <StatCard
              label={t("cards.totalAssets")}
              value={data.assets.total}
              icon={<HardDrive />}
              href="/assets"
            />
            <StatCard
              label={t("cards.assignedAssets")}
              value={data.assets.assigned}
              icon={<PackageCheck />}
              tone="success"
              href="/assets?status=ASSIGNED"
            />
          </>
        ) : null}

        <StatCard
          label={p.seesAllTickets ? t("cards.openTickets") : tk("mine")}
          value={p.seesAllTickets ? data.tickets.open : data.tickets.mine}
          icon={<LifeBuoy />}
          tone="primary"
          href={p.seesAllTickets ? "/tickets?status=open" : "/tickets/mine"}
        />

        {p.seesAllTickets ? (
          <StatCard
            label={t("cards.overdueTickets")}
            value={data.tickets.breached}
            icon={<AlertTriangle />}
            tone={data.tickets.breached > 0 ? "danger" : "neutral"}
            href="/tickets?sla=breached"
          />
        ) : null}

        {p.approvesLeave ? (
          <StatCard
            label={t("cards.pendingLeave")}
            value={data.leave.pendingApprovals}
            icon={<CalendarClock />}
            tone={data.leave.pendingApprovals > 0 ? "warning" : "neutral"}
            href="/leave/approvals"
          />
        ) : null}

        {p.seesEmployees ? (
          <StatCard label={t("cards.headcount")} value={data.hr.headcount} icon={<Users />} href="/employees" />
        ) : null}

        {p.seesAssets ? (
          <StatCard
            label={t("cards.warrantyExpiring")}
            value={data.assets.warrantyExpiring}
            icon={<ShieldCheck />}
            tone={data.assets.warrantyExpiring > 0 ? "warning" : "neutral"}
            href="/assets?warranty=expiring"
          />
        ) : null}

        {p.seesAssets ? (
          <StatCard
            label={t("cards.inRepair")}
            value={data.assets.inRepair}
            icon={<Wrench />}
            tone={data.assets.inRepair > 0 ? "warning" : "neutral"}
            href="/assets?status=IN_REPAIR"
          />
        ) : null}

        {p.seesConsumables && data.inventory.lowStock > 0 ? (
          <StatCard
            label={t("cards.lowStock")}
            value={data.inventory.lowStock}
            icon={<AlertTriangle />}
            tone="warning"
            href="/consumables"
          />
        ) : null}

        {p.seesLicenses && data.inventory.expiringLicenses > 0 ? (
          <StatCard
            label={t("cards.licenseExpiring")}
            value={data.inventory.expiringLicenses}
            icon={<AlertTriangle />}
            tone="warning"
            href="/licenses"
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("sections.recentTickets")}</CardTitle>
            <Link
              href={p.seesAllTickets ? "/tickets" : "/tickets/mine"}
              className="text-xs text-primary hover:underline"
            >
              {tc("actions.viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.tickets.recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.tickets.recent.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 hover:bg-surface-muted/60"
                    >
                      <span className="font-mono text-[11px] text-primary">{ticket.code}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{ticket.title}</span>
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                      <span className="w-full text-[11px] text-muted-foreground sm:w-auto tabular">
                        {formatDateTime(ticket.createdAt, locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {data.leave.myBalances.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{tl("balance.title")}</CardTitle>
              <Link href="/leave" className="text-xs text-primary hover:underline">
                {tc("actions.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.leave.myBalances.map((balance) => {
                const totalAvailable =
                  balance.entitledDays + balance.carriedOverDays + balance.adjustmentDays;
                const remaining = totalAvailable - balance.usedDays - balance.pendingDays;
                const used = totalAvailable > 0 ? (balance.usedDays / totalAvailable) * 100 : 0;
                return (
                  <div key={balance.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
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
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-viz-grid">
                      <div
                        className="h-full rounded-r-[4px]"
                        style={{ width: `${used}%`, backgroundColor: balance.leaveType.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        {p.seesAssets ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("sections.assetsByCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarList
                  emptyLabel={t("empty")}
                  data={data.assets.byCategory.map((row) => ({
                    key: row.key,
                    label: label(row),
                    value: row.value,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("sections.assetsByStatus")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarList
                  emptyLabel={t("empty")}
                  data={data.assets.byStatus.map((row) => ({
                    key: row.key,
                    label: ta(`status.${row.key}` as never),
                    value: row.value,
                  }))}
                />
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("sections.upcomingLeave")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.leave.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{tl("calendar.noLeave")}</p>
            ) : (
              data.leave.upcoming.map((request) => (
                <Link
                  key={request.id}
                  href={`/leave/${request.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-muted"
                >
                  <Avatar name={request.employee.fullName} src={request.employee.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{request.employee.fullName}</span>
                    <span className="block text-[11px] text-muted-foreground tabular">
                      {formatDate(request.startDate, locale)} - {formatDate(request.endDate, locale)}
                    </span>
                  </span>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: request.leaveType.color }}
                    aria-hidden
                  />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {p.seesAssets && data.assignments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("sections.recentAssignments")}</CardTitle>
              <Link href="/assets/assignments" className="text-xs text-primary hover:underline">
                {tc("actions.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.assignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/assets/${assignment.asset.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-muted"
                >
                  <Avatar name={assignment.employee.fullName} src={assignment.employee.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{assignment.asset.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {assignment.employee.fullName} · {formatDate(assignment.assignedAt, locale)}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
