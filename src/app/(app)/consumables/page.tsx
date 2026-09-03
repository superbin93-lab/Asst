import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contains, pagination, param } from "@/lib/query";
import type { Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/config";
import { ConsumablePanel } from "@/features/inventory/consumable-panel";
import { ConsumableFilters } from "@/features/inventory/consumable-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";

export async function generateMetadata() {
  const t = await getTranslations("catalog.consumables");
  return { title: t("title") };
}

export default async function ConsumablesPage({ searchParams }: PageProps<"/consumables">) {
  const user = await requirePermission(PERMISSIONS.CONSUMABLE_VIEW);
  const sp = await searchParams;

  const [t, locale] = await Promise.all([
    getTranslations("catalog.consumables"),
    getLocale() as Promise<AppLocale>,
  ]);

  const q = param(sp, "q");
  const locationId = param(sp, "location");
  const { page, perPage, skip, take } = pagination(sp);

  const where: Prisma.ConsumableWhereInput = {
    ...(q ? { OR: [{ name: contains(q) }, { code: contains(q) }] } : {}),
    ...(locationId ? { locationId } : {}),
  };

  const [rows, total, all, categories, locations, employees] = await Promise.all([
    db.consumable.findMany({
      where,
      skip,
      take,
      orderBy: { code: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    }),
    db.consumable.count({ where }),
    db.consumable.findMany({ select: { quantity: true, minQuantity: true } }),
    db.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.location.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);

  const lowStock = all.filter((c) => c.quantity <= c.minQuantity).length;
  const totalUnits = all.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("title")} value={all.length} />
        <StatCard label={t("quantity")} value={totalUnits} tone="primary" />
        <StatCard label={t("belowMinimum")} value={lowStock} tone="warning" />
      </div>

      <ConsumableFilters
        locations={locations.map((l) => ({ value: l.id, label: `${l.code} - ${l.name}` }))}
      />

      <ConsumablePanel
        locale={locale}
        canManage={can(user, PERMISSIONS.CONSUMABLE_MANAGE)}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        locations={locations.map((l) => ({ id: l.id, label: `${l.code} - ${l.name}` }))}
        employees={employees}
        rows={rows.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          categoryId: r.categoryId,
          categoryName: r.category?.name ?? null,
          locationId: r.locationId,
          locationName: r.location?.name ?? null,
          unit: r.unit,
          quantity: r.quantity,
          minQuantity: r.minQuantity,
          unitCost: r.unitCost?.toString() ?? null,
          currency: r.currency,
          notes: r.notes,
          isActive: r.isActive,
        }))}
      />

      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
