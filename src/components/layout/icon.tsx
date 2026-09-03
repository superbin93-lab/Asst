import {
  BarChart3, CalendarDays, HardDrive, LayoutDashboard, LifeBuoy, Library, Settings, Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Nav icons are referenced by name from `NAV_SECTIONS`, which is plain data so
 * it can be shared between server and client without pulling in components.
 */
const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "hard-drive": HardDrive,
  "life-buoy": LifeBuoy,
  "calendar-days": CalendarDays,
  users: Users,
  "bar-chart-3": BarChart3,
  library: Library,
  settings: Settings,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
