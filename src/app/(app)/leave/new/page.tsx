import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { getLeaveBalances, getLeaveFormOptions, getHolidays } from "@/features/leave/queries";
import { createLeaveRequest } from "@/features/leave/actions";
import { LeaveForm } from "@/features/leave/leave-form";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export async function generateMetadata() {
  const t = await getTranslations("leave");
  return { title: t("newRequest") };
}

export default async function NewLeaveRequestPage() {
  const user = await requireUser();
  const [t, tc, options, settings, holidays] = await Promise.all([
    getTranslations("leave"),
    getTranslations("common.actions"),
    getLeaveFormOptions(user),
    getSettings(),
    getHolidays(new Date().getFullYear()),
  ]);

  if (!user.employeeId && !options.canPickEmployee) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title={t("newRequest")} />
        <EmptyState title={t("validation.noApprover")} />
      </div>
    );
  }

  const year = new Date().getFullYear();
  const balances = user.employeeId ? await getLeaveBalances(user.employeeId, year) : [];

  // Types with no balance row still appear; the server re-checks on submit.
  const summaries = options.types.map((type) => {
    const balance = balances.find((b) => b.leaveTypeId === type.id);
    const available = balance
      ? balance.entitledDays + balance.carriedOverDays + balance.adjustmentDays - balance.usedDays - balance.pendingDays
      : 0;
    return { leaveTypeId: type.id, available };
  });

  const handoverCandidates = await db.employee.findMany({
    where: { status: { not: "TERMINATED" }, id: { not: user.employeeId ?? undefined } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeCode: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Breadcrumbs items={[{ label: t("myLeave"), href: "/leave" }, { label: t("newRequest") }]} />
      <PageHeader title={t("newRequest")} description={t("subtitle")} />
      <LeaveForm
        action={createLeaveRequest}
        types={options.types.map((x) => ({
          id: x.id,
          code: x.code,
          name: x.name,
          nameEn: x.nameEn,
          allowHalfDay: x.allowHalfDay,
          requiresAttachment: x.requiresAttachment,
          minNoticeDays: x.minNoticeDays,
          deductsBalance: x.deductsBalance,
        }))}
        employees={options.canPickEmployee ? options.employees : handoverCandidates}
        balances={summaries}
        holidays={holidays.map((h) => ({
          date: h.date.toISOString(),
          isHalfDay: h.isHalfDay,
          isRecurring: h.isRecurring,
        }))}
        workweek={settings.workweek}
        canPickEmployee={options.canPickEmployee}
        defaultEmployeeId={user.employeeId}
        submitLabel={tc("submit")}
      />
    </div>
  );
}
