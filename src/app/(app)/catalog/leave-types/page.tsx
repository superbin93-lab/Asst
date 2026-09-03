import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { LeaveTypePanel } from "@/features/catalog/service-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("leave.types");
  return { title: t("title") };
}

export default async function LeaveTypesPage() {
  const user = await requirePermission(PERMISSIONS.LEAVE_MANAGE);
  const [t, rows] = await Promise.all([
    getTranslations("leave.types"),
    db.leaveType.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { requests: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <LeaveTypePanel
        canManage={can(user, PERMISSIONS.LEAVE_MANAGE)}
        rows={rows.map((r) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          name: r.name,
          nameEn: r.nameEn,
          color: r.color,
          defaultDaysPerYear: r.defaultDaysPerYear,
          isPaid: r.isPaid,
          allowHalfDay: r.allowHalfDay,
          requiresAttachment: r.requiresAttachment,
          deductsBalance: r.deductsBalance,
          carryOverLimitDays: r.carryOverLimitDays,
          carryOverExpiry: r.carryOverExpiry,
          maxConsecutiveDays: r.maxConsecutiveDays,
          minNoticeDays: r.minNoticeDays,
          isActive: r.isActive,
          requestCount: r._count.requests,
        }))}
      />
    </div>
  );
}
