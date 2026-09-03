import "server-only";
import { cookies } from "next/headers";
import { isThemeSetting, THEME_COOKIE, type ThemeSetting } from "./theme";

/** Reads the stored theme preference so the toggle renders correctly server-side. */
export async function getStoredTheme(): Promise<ThemeSetting> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isThemeSetting(value) ? value : "system";
}
