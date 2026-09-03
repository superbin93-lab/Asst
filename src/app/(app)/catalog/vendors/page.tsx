import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { VendorPanel } from "@/features/catalog/asset-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("catalog.vendors");
  return { title: t("title") };
}

export default async function VendorsPage() {
  const user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  const [t, rows] = await Promise.all([
    getTranslations("catalog.vendors"),
    db.vendor.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { manufacturedAssets: true, suppliedAssets: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <VendorPanel
        canManage={can(user, PERMISSIONS.CATALOG_MANAGE)}
        rows={rows.map((r) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          name: r.name,
          contactName: r.contactName ?? "-",
          phone: r.phone ?? "-",
          email: r.email ?? "-",
          taxCode: r.taxCode,
          website: r.website,
          address: r.address,
          notes: r.notes,
          isManufacturer: r.isManufacturer,
          isSupplier: r.isSupplier,
          isActive: r.isActive,
          assetCount: r._count.manufacturedAssets + r._count.suppliedAssets,
        }))}
      />
    </div>
  );
}
