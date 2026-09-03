"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAppLocale, LOCALE_COOKIE, type AppLocale } from "@/i18n/config";
import { isThemeSetting, THEME_COOKIE, type ThemeSetting } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocale(locale: AppLocale) {
  if (!isAppLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });

  // Persist on the account so the choice follows the user to another device.
  const user = await getCurrentUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { locale } });

  revalidatePath("/", "layout");
}

export async function setTheme(theme: ThemeSetting) {
  if (!isThemeSetting(theme)) return;
  const store = await cookies();
  store.set(THEME_COOKIE, theme, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}
