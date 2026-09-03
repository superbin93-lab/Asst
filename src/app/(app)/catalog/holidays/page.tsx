import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/config";
import { HolidayPanel } from "@/features/catalog/service-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("leave.holidays");
  return { title: t("title") };
}

export default async function HolidaysPage() {
  const user = await requirePermission(PERMISSIONS.LEAVE_MANAGE);
  const [t, locale, rows] = await Promise.all([
    getTranslations("leave.holidays"),
    getLocale() as Promise<AppLocale>,
    db.holiday.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("hint")} />
      <HolidayPanel
        locale={locale}
        canManage={can(user, PERMISSIONS.LEAVE_MANAGE)}
        rows={rows.map((r) => ({
          id: r.id,
          label: r.name,
          date: r.date,
          name: r.name,
          nameEn: r.nameEn,
          isRecurring: r.isRecurring,
          isHalfDay: r.isHalfDay,
        }))}
      />
    </div>
  );
}
