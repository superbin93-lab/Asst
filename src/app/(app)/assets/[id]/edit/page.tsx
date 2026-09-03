import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAsset, getAssetFormOptions } from "@/features/assets/queries";
import { updateAsset } from "@/features/assets/actions";
import { AssetForm } from "@/features/assets/asset-form";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";

export default async function EditAssetPage({ params }: PageProps<"/assets/[id]/edit">) {
  await requirePermission(PERMISSIONS.ASSET_UPDATE);
  const { id } = await params;

  const [t, tc, asset, options] = await Promise.all([
    getTranslations("assets"),
    getTranslations("common.actions"),
    getAsset(id),
    getAssetFormOptions(),
  ]);
  if (!asset) notFound();

  const update = async (formData: FormData) => {
    "use server";
    return updateAsset(id, formData);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/assets" },
          { label: asset.assetTag, href: `/assets/${id}` },
          { label: t("edit") },
        ]}
      />
      <PageHeader title={t("edit")} description={`${asset.assetTag} - ${asset.name}`} />
      <AssetForm
        action={update}
        options={options}
        submitLabel={tc("saveChanges")}
        defaults={{
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          categoryId: asset.categoryId,
          status: asset.status,
          condition: asset.condition,
          serialNumber: asset.serialNumber,
          model: asset.model,
          manufacturerId: asset.manufacturerId,
          supplierId: asset.supplierId,
          purchaseDate: asset.purchaseDate,
          purchaseCost: asset.purchaseCost?.toString() ?? null,
          currency: asset.currency,
          invoiceNo: asset.invoiceNo,
          poNumber: asset.poNumber,
          warrantyMonths: asset.warrantyMonths,
          warrantyEndAt: asset.warrantyEndAt,
          usefulLifeMonths: asset.usefulLifeMonths,
          depreciationMethod: asset.depreciationMethod,
          salvageValue: asset.salvageValue?.toString() ?? null,
          locationId: asset.locationId,
          departmentId: asset.departmentId,
          notes: asset.notes,
          specs: asset.specs as Record<string, unknown> | null,
        }}
      />
    </div>
  );
}
