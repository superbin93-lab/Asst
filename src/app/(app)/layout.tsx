import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guard";
import { canAny } from "@/lib/auth/permissions";
import { NAV_SECTIONS } from "@/lib/navigation";
import { db } from "@/lib/db";
import { getStoredTheme } from "@/lib/theme-server";
import { AppShell } from "@/components/layout/app-shell";
import type { VisibleNavSection } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [t, theme] = await Promise.all([getTranslations("app"), getStoredTheme()]);

  // Only sections and items the user can actually reach are sent to the client.
  const sections: VisibleNavSection[] = NAV_SECTIONS.flatMap((section) => {
    if (section.permissions && !canAny(user, section.permissions)) return [];
    const items = section.items.filter(
      (item) => !item.permissions || canAny(user, item.permissions),
    );
    if (items.length === 0) return [];
    return [{ key: section.key, icon: section.icon, items: items.map(({ key, href, exact }) => ({ key, href, exact })) }];
  });

  const roles = user.roleCodes.length
    ? await db.role.findMany({
        where: { code: { in: user.roleCodes } },
        select: { name: true },
      })
    : [];

  return (
    <AppShell
      sections={sections}
      appName={t("shortName")}
      theme={theme}
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roles: roles.map((r) => r.name),
      }}
    >
      {children}
    </AppShell>
  );
}
