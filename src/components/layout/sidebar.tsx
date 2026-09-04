"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { NavIcon } from "./icon";

export type VisibleNavSection = {
  key: string;
  icon: string;
  items: { key: string; href: string; exact?: boolean }[];
};

function matches(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The deepest matching href wins, so `/assets/assignments` lights up "Cấp phát"
 * alone instead of every item whose href is a prefix of the current path.
 */
function activeHrefOf(pathname: string, sections: VisibleNavSection[]) {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      if (!matches(pathname, item.href, item.exact)) continue;
      if (best === null || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

/** A section that is nothing but its own landing page renders as a plain link. */
function isSingle(section: VisibleNavSection) {
  return section.items.length === 1 && section.items[0].key === section.key;
}

const ROW = "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors";
const IDLE = "text-muted-foreground hover:bg-surface-muted hover:text-foreground";
const ACTIVE = "bg-primary-subtle font-medium text-primary";
const RAIL_ROW = "flex size-10 items-center justify-center rounded-md transition-colors";

export function Sidebar({
  sections,
  appName,
  open,
  onClose,
  collapsed,
}: {
  sections: VisibleNavSection[];
  appName: string;
  open: boolean;
  onClose: () => void;
  /** Desktop rail. The mobile drawer always shows labels, so `open` wins. */
  collapsed: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const activeHref = activeHrefOf(pathname, sections);
  const activeSection =
    sections.find((section) => section.items.some((item) => item.href === activeHref))?.key ?? null;

  // The open section follows the route; clicking a header overrides that only
  // until the next navigation, so the two never need an effect to stay in sync.
  const [override, setOverride] = useState<{ pathname: string; key: string | null } | null>(null);
  const openKey = override?.pathname === pathname ? override.key : activeSection;

  // Below `lg` the sidebar is only ever on screen while `open`, so the rail can
  // never be the thing a phone sees - no media query needed to tell them apart.
  const rail = collapsed && !open;

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-[width,transform] lg:translate-x-0",
          rail ? "w-16" : "w-64",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            rail ? "justify-center px-2" : "justify-between gap-2 px-4",
          )}
        >
          <Tooltip content={rail ? appName : null} side="right">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-semibold text-primary"
              aria-label={rail ? appName : undefined}
            >
              <ShieldCheck className="size-5 shrink-0" />
              {rail ? null : <span className="truncate">{appName}</span>}
            </Link>
          </Tooltip>
          {rail ? null : (
            <Button
              variant="ghost"
              size="iconSm"
              className="lg:hidden"
              onClick={onClose}
              aria-label={t("closeMenu")}
            >
              <X />
            </Button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-3 scrollbar-thin">
          {sections.map((section) => {
            const single = isSingle(section);
            const sectionActive = section.items.some((item) => item.href === activeHref);

            if (rail) {
              if (single) {
                const item = section.items[0];
                return (
                  <Tooltip key={section.key} content={t(item.key)} side="right">
                    <Link
                      href={item.href}
                      aria-label={t(item.key)}
                      className={cn(RAIL_ROW, sectionActive ? ACTIVE : IDLE)}
                    >
                      <NavIcon name={section.icon} className="size-[18px]" />
                    </Link>
                  </Tooltip>
                );
              }

              // Collapsed sections keep their children one click away instead of
              // forcing the sidebar open again.
              return (
                <Dropdown key={section.key}>
                  <Tooltip content={t(section.key)} side="right">
                    <DropdownTrigger asChild>
                      <button
                        type="button"
                        aria-label={t(section.key)}
                        className={cn(RAIL_ROW, sectionActive ? ACTIVE : IDLE)}
                      >
                        <NavIcon name={section.icon} className="size-[18px]" />
                      </button>
                    </DropdownTrigger>
                  </Tooltip>
                  <DropdownContent side="right" align="start" sideOffset={8} className="min-w-52">
                    <DropdownLabel>{t(section.key)}</DropdownLabel>
                    <DropdownSeparator />
                    {section.items.map((item) => (
                      <DropdownItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={item.href === activeHref ? "font-medium text-primary" : undefined}
                        >
                          {t(item.key)}
                        </Link>
                      </DropdownItem>
                    ))}
                  </DropdownContent>
                </Dropdown>
              );
            }

            if (single) {
              const item = section.items[0];
              return (
                <Link
                  key={section.key}
                  href={item.href}
                  onClick={onClose}
                  className={cn(ROW, sectionActive ? ACTIVE : IDLE)}
                >
                  <NavIcon name={section.icon} className="size-4 shrink-0" />
                  {t(item.key)}
                </Link>
              );
            }

            const expanded = openKey === section.key;
            return (
              <div key={section.key}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOverride({ pathname, key: expanded ? null : section.key })
                  }
                  className={cn(
                    ROW,
                    "w-full text-left",
                    sectionActive && !expanded
                      ? "font-medium text-foreground hover:bg-surface-muted"
                      : IDLE,
                  )}
                >
                  <NavIcon name={section.icon} className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{t(section.key)}</span>
                  <ChevronDown
                    className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
                  />
                </button>

                {expanded ? (
                  <div className="mt-0.5 space-y-0.5">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "block rounded-md py-1.5 pl-9 pr-2.5 text-sm transition-colors",
                          item.href === activeHref ? ACTIVE : IDLE,
                        )}
                      >
                        {t(item.key)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
