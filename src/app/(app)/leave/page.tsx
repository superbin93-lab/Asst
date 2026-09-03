import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { formatNumber } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { getLeaveBalances, listLeaveRequests } from "@/features/leave/queries";
import { LeaveTable } from "@/features/leave/leave-table";
import { LeaveFilters } from "@/features/leave/leave-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";

export async function generateMetadata() {
  const t = await getTranslations("leave");
  return { title: t("myLeave") };
}

export default async function MyLeavePage({ searchParams }: PageProps<"/leave">) {
  const user = await requireUser();
  const sp = await searchParams;

  const [t, tc, locale] = await Promise.all([
    getTranslations("leave"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
  ]);

  if (!user.employeeId) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("myLeave")} description={t("subtitle")} />
        <EmptyState title={t("noEmployeeProfile")} description={t("noEmployeeProfileHint")} />
      </div>
    );
  }

  const year = Number(
    (Array.isArray(sp.year) ? sp.year[0] : sp.year) ?? new Date().getFullYear(),
  );

  const [balances, { rows, total, page, perPage }, types] = await Promise.all([
    getLeaveBalances(user.employeeId, year),
    listLeaveRequests(sp, user, "mine"),
    db.leaveType.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, nameEn: true } }),
  ]);

  const typeLabel = (x: { name: string; nameEn: string | null }) =>
    locale === "en" && x.nameEn ? x.nameEn : x.name;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("myLeave")}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/leave/new">
              <CalendarPlus />
              {t("newRequest")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {balances.length === 0 ? (
          <Card className="sm:col-span-2 xl:col-span-4">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              {t("balance.title")}: {tc("table.empty")}
            </CardContent>
          </Card>
        ) : (
          balances.map((balance) => {
            const totalAvailable =
              balance.entitledDays + balance.carriedOverDays + balance.adjustmentDays;
            const remaining = totalAvailable - balance.usedDays - balance.pendingDays;
            const usedPercent = totalAvailable > 0 ? Math.min(100, (balance.usedDays / totalAvailable) * 100) : 0;

            return (
              <Card key={balance.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: balance.leaveType.color }}
                        aria-hidden
                      />
                      {typeLabel(balance.leaveType)}
                    </span>
                    <span className="text-xs text-muted-foreground">{year}</span>
                  </div>

                  <p className="text-2xl font-semibold tabular leading-none">
                    {formatNumber(remaining, locale, 1)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / {formatNumber(totalAvailable, locale, 1)}
                    </span>
                  </p>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${usedPercent}%`, backgroundColor: balance.leaveType.color }}
                    />
                  </div>

                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      {t("balance.used")}: <span className="tabular">{formatNumber(balance.usedDays, locale, 1)}</span>
                    </span>
                    <span>
                      {t("balance.pending")}:{" "}
                      <span className="tabular">{formatNumber(balance.pendingDays, locale, 1)}</span>
                    </span>
                    {balance.carriedOverDays > 0 ? (
                      <span>
                        {t("balance.carriedOver")}:{" "}
                        <span className="tabular">{formatNumber(balance.carriedOverDays, locale, 1)}</span>
                      </span>
                    ) : null}
                  </dl>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <LeaveFilters types={types.map((x) => ({ value: x.id, label: typeLabel(x) }))} departments={[]} />

      <LeaveTable rows={rows} showEmployee={false} />

      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
