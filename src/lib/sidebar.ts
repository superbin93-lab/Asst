export const SIDEBAR_COOKIE = "itam_sidebar";

export const SIDEBAR_MODES = ["expanded", "collapsed"] as const;
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

export function isSidebarMode(value: unknown): value is SidebarMode {
  return typeof value === "string" && (SIDEBAR_MODES as readonly string[]).includes(value);
}
