import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { CategoryPanel } from "@/features/catalog/asset-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("catalog.categories");
  return { title: t("title") };
}

export default async function CategoriesPage() {
  const user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  const [t, rows] = await Promise.all([
    getTranslations("catalog.categories"),
    db.assetCategory.findMany({
      orderBy: { code: "asc" },
      include: { parent: { select: { name: true } }, _count: { select: { assets: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <CategoryPanel
        canManage={can(user, PERMISSIONS.CATALOG_MANAGE)}
        rows={rows.map((r) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          name: r.name,
          nameEn: r.nameEn,
          parentId: r.parentId,
          parentName: r.parent?.name ?? "-",
          defaultUsefulLifeMonths: r.defaultUsefulLifeMonths,
          defaultWarrantyMonths: r.defaultWarrantyMonths,
          isActive: r.isActive,
          assetCount: r._count.assets,
        }))}
      />
    </div>
  );
}
