import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAssetFormOptions } from "@/features/assets/queries";
import { createAsset } from "@/features/assets/actions";
import { AssetForm } from "@/features/assets/asset-form";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("assets");
  return { title: t("new") };
}

export default async function NewAssetPage() {
  await requirePermission(PERMISSIONS.ASSET_CREATE);
  const [t, tc, options] = await Promise.all([
    getTranslations("assets"),
    getTranslations("common.actions"),
    getAssetFormOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: "/assets" }, { label: t("new") }]} />
      <PageHeader title={t("new")} />
      <AssetForm action={createAsset} options={options} submitLabel={tc("create")} />
    </div>
  );
}
