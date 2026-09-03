import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/settings";
import type { AppLocale } from "@/i18n/config";
import { SettingsForm } from "@/features/admin/settings-form";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("admin.settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  await requirePermission(PERMISSIONS.ADMIN_SETTINGS);
  const [t, locale, settings] = await Promise.all([
    getTranslations("admin.settings"),
    getLocale() as Promise<AppLocale>,
    getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={t("title")} />
      <SettingsForm settings={settings} locale={locale} />
    </div>
  );
}
