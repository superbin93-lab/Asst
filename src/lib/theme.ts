export const THEME_COOKIE = "itam_theme";

export const THEME_SETTINGS = ["light", "dark", "system"] as const;
export type ThemeSetting = (typeof THEME_SETTINGS)[number];

export function isThemeSetting(value: unknown): value is ThemeSetting {
  return typeof value === "string" && (THEME_SETTINGS as readonly string[]).includes(value);
}
