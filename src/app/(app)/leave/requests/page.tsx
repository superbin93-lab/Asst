import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/config";
import { listLeaveRequests } from "@/features/leave/queries";
import { LeaveTable } from "@/features/leave/leave-table";
import { LeaveFilters } from "@/features/leave/leave-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("leaveRequests") };
}

export default async function LeaveRequestsPage({ searchParams }: PageProps<"/leave/requests">) {
  const user = await requirePermission(PERMISSIONS.LEAVE_VIEW_ALL);
  const sp = await searchParams;

  const [t, tn, locale, { rows, total, page, perPage }, types, departments] = await Promise.all([
    getTranslations("leave"),
    getTranslations("nav"),
    getLocale() as Promise<AppLocale>,
    listLeaveRequests(sp, user, "all"),
    db.leaveType.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, nameEn: true } }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nameEn: true } }),
  ]);

  const label = (x: { name: string; nameEn: string | null }) =>
    locale === "en" && x.nameEn ? x.nameEn : x.name;

  return (
    <div className="space-y-5">
      <PageHeader title={tn("leaveRequests")} description={t("subtitle")} />
      <LeaveFilters
        types={types.map((x) => ({ value: x.id, label: label(x) }))}
        departments={departments.map((d) => ({ value: d.id, label: label(d) }))}
      />
      <LeaveTable rows={rows} />
      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
