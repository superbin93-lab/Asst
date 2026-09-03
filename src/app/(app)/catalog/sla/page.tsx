import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/config";
import { SlaPanel } from "@/features/catalog/service-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("tickets.sla");
  return { title: t("title") };
}

export default async function SlaPage() {
  const user = await requirePermission(PERMISSIONS.TICKET_CONFIG);
  const [t, locale, rows] = await Promise.all([
    getTranslations("tickets.sla"),
    getLocale() as Promise<AppLocale>,
    db.slaPolicy.findMany({
      orderBy: [{ name: "asc" }, { priority: "desc" }],
      include: { _count: { select: { categories: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <SlaPanel
        locale={locale}
        canManage={can(user, PERMISSIONS.TICKET_CONFIG)}
        rows={rows.map((r) => ({
          id: r.id,
          label: `${r.name} - ${r.priority}`,
          name: r.name,
          priority: r.priority,
          responseMinutes: r.responseMinutes,
          resolutionMinutes: r.resolutionMinutes,
          businessHoursOnly: r.businessHoursOnly,
          categoryCount: r._count.categories,
        }))}
      />
    </div>
  );
}
