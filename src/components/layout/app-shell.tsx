"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Sidebar, type VisibleNavSection } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { logout } from "@/app/actions/logout";
import type { ThemeSetting } from "@/lib/theme";

export function AppShell({
  sections,
  appName,
  user,
  theme,
  children,
}: {
  sections: VisibleNavSection[];
  appName: string;
  user: { name: string; email: string; avatarUrl: string | null; roles: string[] };
  theme: ThemeSetting;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <Sidebar sections={sections} appName={appName} open={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/85 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="iconSm"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu />
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle initial={theme} />

            <Dropdown>
              <DropdownTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-surface-muted">
                  <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                </button>
              </DropdownTrigger>
              <DropdownContent className="min-w-56">
                <DropdownLabel className="py-2">
                  <span className="block text-sm font-medium text-foreground">{user.name}</span>
                  <span className="block truncate text-xs">{user.email}</span>
                  {user.roles.length ? (
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {user.roles.join(", ")}
                    </span>
                  ) : null}
                </DropdownLabel>
                <DropdownSeparator />
                <DropdownItem asChild>
                  <a href="/profile">
                    <User />
                    {t("profile")}
                  </a>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem tone="danger" onSelect={() => void logout()}>
                  <LogOut />
                  {t("signOut")}
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
