import "server-only";
import { cookies } from "next/headers";
import { isSidebarMode, SIDEBAR_COOKIE, type SidebarMode } from "./sidebar";

/**
 * Reads the stored sidebar width so the rail renders at the right size on the
 * first paint - the main content is offset by it, so guessing would shift the
 * whole page once hydration lands.
 */
export async function getStoredSidebar(): Promise<SidebarMode> {
  const store = await cookies();
  const value = store.get(SIDEBAR_COOKIE)?.value;
  return isSidebarMode(value) ? value : "collapsed";
}
