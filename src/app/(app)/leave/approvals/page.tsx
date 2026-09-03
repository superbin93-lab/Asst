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
  const t = await getTranslations("leave");
  return { title: t("approvals") };
}

export default async function LeaveApprovalsPage({ searchParams }: PageProps<"/leave/approvals">) {
  const user = await requirePermission(PERMISSIONS.LEAVE_APPROVE);
  const sp = await searchParams;

  const [t, locale, { rows, total, page, perPage }, types] = await Promise.all([
    getTranslations("leave"),
    getLocale() as Promise<AppLocale>,
    listLeaveRequests(sp, user, "approvals"),
    db.leaveType.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, nameEn: true } }),
  ]);

  const typeLabel = (x: { name: string; nameEn: string | null }) =>
    locale === "en" && x.nameEn ? x.nameEn : x.name;

  return (
    <div className="space-y-5">
      <PageHeader title={t("approvals")} description={t("approval.noPending")} />
      <LeaveFilters types={types.map((x) => ({ value: x.id, label: typeLabel(x) }))} departments={[]} />
      <LeaveTable rows={rows} />
      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
