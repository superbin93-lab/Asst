export const LOCALES = ["vi", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "itam_locale";
export const DEFAULT_LOCALE: AppLocale = "vi";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
