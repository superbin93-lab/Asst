import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { LocationPanel } from "@/features/catalog/asset-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("catalog.locations");
  return { title: t("title") };
}

export default async function LocationsPage() {
  const user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  const [t, rows] = await Promise.all([
    getTranslations("catalog.locations"),
    db.location.findMany({
      orderBy: { code: "asc" },
      include: { parent: { select: { name: true } }, _count: { select: { assets: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <LocationPanel
        canManage={can(user, PERMISSIONS.CATALOG_MANAGE)}
        rows={rows.map((r) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          name: r.name,
          type: r.type,
          parentId: r.parentId,
          parentName: r.parent?.name ?? "-",
          address: r.address ?? "-",
          isActive: r.isActive,
          assetCount: r._count.assets,
        }))}
      />
    </div>
  );
}
