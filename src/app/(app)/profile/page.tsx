import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getStoredTheme } from "@/lib/theme-server";
import type { AppLocale } from "@/i18n/config";
import { ChangePasswordForm } from "@/features/admin/change-password-form";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PageHeader } from "@/components/shared/page-header";
import { DescriptionItem, DescriptionList } from "@/components/shared/description-list";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("profile") };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const [t, tc, ta, locale, theme, roles] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("admin.users"),
    getLocale() as Promise<AppLocale>,
    getStoredTheme(),
    db.role.findMany({ where: { code: { in: user.roleCodes } }, select: { name: true } }),
  ]);

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { lastLoginAt: true, createdAt: true, employee: { select: { employeeCode: true, fullName: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t("profile")} />

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 py-5">
          <div className="flex items-start gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" />
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {user.isSuperAdmin ? <Badge tone="danger">{ta("fields.isSuperAdmin")}</Badge> : null}
                {roles.map((role) => (
                  <Badge key={role.name} tone="neutral">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher withLabel />
            <ThemeToggle initial={theme} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tc("labels.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList>
            <DescriptionItem label={ta("fields.employee")}>
              {account.employee ? `${account.employee.employeeCode} - ${account.employee.fullName}` : "-"}
            </DescriptionItem>
            <DescriptionItem label={ta("fields.lastLoginAt")}>
              <span className="tabular">{formatDateTime(account.lastLoginAt, locale)}</span>
            </DescriptionItem>
            <DescriptionItem label={tc("labels.createdAt")}>
              <span className="tabular">{formatDateTime(account.createdAt, locale)}</span>
            </DescriptionItem>
          </DescriptionList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ta("resetPassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
