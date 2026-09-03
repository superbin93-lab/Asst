import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import type { AppLocale } from "@/i18n/config";
import { LicensePanel } from "@/features/inventory/license-panel";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";

/** One clock read per request, outside the component body. */
function expiryWindow(alertDays: number) {
  const now = new Date();
  return { now, cutoff: new Date(now.getTime() + alertDays * 86_400_000) };
}

const daysUntil = (date: Date | null, now: Date) =>
  date === null ? null : Math.ceil((date.getTime() - now.getTime()) / 86_400_000);

export async function generateMetadata() {
  const t = await getTranslations("catalog.licenses");
  return { title: t("title") };
}

export default async function LicensesPage() {
  const user = await requirePermission(PERMISSIONS.LICENSE_VIEW);
  const [t, locale, settings, rows, vendors, employees] = await Promise.all([
    getTranslations("catalog.licenses"),
    getLocale() as Promise<AppLocale>,
    getSettings(),
    db.softwareLicense.findMany({
      orderBy: { name: "asc" },
      include: {
        vendor: { select: { id: true, name: true } },
        seats: {
          where: { revokedAt: null },
          include: {
            employee: { select: { fullName: true } },
            asset: { select: { assetTag: true } },
          },
        },
      },
    }),
    db.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);

  const { now, cutoff } = expiryWindow(settings.licenseAlertDays);
  const expiring = rows.filter((r) => r.expiryDate && r.expiryDate >= now && r.expiryDate <= cutoff).length;
  const seatsTotal = rows.reduce((sum, r) => sum + r.seatsTotal, 0);
  const seatsUsed = rows.reduce((sum, r) => sum + r.seats.length, 0);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("title")} value={rows.length} />
        <StatCard label={t("seatsUsed")} value={`${seatsUsed}/${seatsTotal}`} tone="primary" />
        <StatCard label={t("seatsAvailable")} value={seatsTotal - seatsUsed} tone="success" />
        <StatCard label={t("expiringSoon", { days: settings.licenseAlertDays })} value={expiring} tone="warning" />
      </div>

      <LicensePanel
        locale={locale}
        alertDays={settings.licenseAlertDays}
        vendors={vendors}
        employees={employees}
        canManage={can(user, PERMISSIONS.LICENSE_MANAGE)}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          vendorId: r.vendorId,
          vendorName: r.vendor?.name ?? null,
          licenseKey: r.licenseKey,
          type: r.type,
          seatsTotal: r.seatsTotal,
          seatsUsed: r.seats.length,
          purchaseDate: r.purchaseDate,
          expiryDate: r.expiryDate,
          daysToExpiry: daysUntil(r.expiryDate, now),
          cost: r.cost?.toString() ?? null,
          currency: r.currency,
          notes: r.notes,
          isActive: r.isActive,
          seats: r.seats.map((s) => ({
            id: s.id,
            holder: s.employee?.fullName ?? s.asset?.assetTag ?? "-",
            assignedAt: s.assignedAt,
          })),
        }))}
      />
    </div>
  );
}
