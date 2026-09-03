"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { setTheme } from "@/app/actions/preferences";
import type { ThemeSetting } from "@/lib/theme";

const ICONS = { light: Sun, dark: Moon, system: Monitor };

/**
 * The stored preference is read from the cookie on the server and handed in, so
 * the button renders the right icon on the first paint with no effect and no
 * hydration mismatch.
 */
export function ThemeToggle({ initial = "system" }: { initial?: ThemeSetting }) {
  const t = useTranslations("common.theme");
  const [current, setCurrent] = useState<ThemeSetting>(initial);
  const [, startTransition] = useTransition();

  function apply(next: ThemeSetting) {
    setCurrent(next);
    const dark = next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    startTransition(() => void setTheme(next));
  }

  const Icon = ICONS[current];

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("toggle")}>
          <Icon />
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        {(["light", "dark", "system"] as const).map((value) => {
          const ItemIcon = ICONS[value];
          return (
            <DropdownItem key={value} onSelect={() => apply(value)}>
              <ItemIcon />
              {t(value)}
              {current === value ? <span className="ml-auto text-xs text-primary">&#10003;</span> : null}
            </DropdownItem>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
}
