import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getStoredTheme } from "@/lib/theme-server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");

  const [t, tApp, settings, params, theme] = await Promise.all([
    getTranslations("auth"),
    getTranslations("app"),
    getSettings(),
    searchParams,
    getStoredTheme(),
  ]);

  const redirectTo = typeof params.from === "string" ? params.from : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-5" />
          {tApp("name")}
        </div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight">{tApp("tagline")}</p>
          <p className="mt-4 text-sm opacity-80">{settings.companyName}</p>
        </div>
        <p className="text-xs opacity-60">
          {settings.companyAddress || settings.companyEmail}
        </p>
      </section>

      <section className="flex flex-col">
        <div className="flex items-center justify-end gap-1 p-4">
          <LocaleSwitcher />
          <ThemeToggle initial={theme} />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck className="size-5" />
                {tApp("name")}
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{t("signInTitle")}</h1>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("signInSubtitle")}</p>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </section>
    </main>
  );
}
