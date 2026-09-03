"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavIcon } from "./icon";

export type VisibleNavSection = {
  key: string;
  icon: string;
  items: { key: string; href: string; exact?: boolean }[];
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  sections,
  appName,
  open,
  onClose,
}: {
  sections: VisibleNavSection[];
  appName: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck className="size-5" />
            <span className="truncate">{appName}</span>
          </Link>
          <Button variant="ghost" size="iconSm" className="lg:hidden" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
          {sections.map((section) => {
            const single = section.items.length === 1 && section.items[0].key === section.key;
            if (single) {
              const item = section.items[0];
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={section.key}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary-subtle font-medium text-primary"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <NavIcon name={section.icon} className="size-4 shrink-0" />
                  {t(item.key)}
                </Link>
              );
            }

            return (
              <div key={section.key}>
                <p className="mb-1.5 flex items-center gap-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <NavIcon name={section.icon} className="size-3.5" />
                  {t(section.key)}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href, item.exact);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "block rounded-md py-1.5 pl-8 pr-2.5 text-sm transition-colors",
                          active
                            ? "bg-primary-subtle font-medium text-primary"
                            : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                        )}
                      >
                        {t(item.key)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
