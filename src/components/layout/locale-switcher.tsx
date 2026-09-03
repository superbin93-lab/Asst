"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { setLocale } from "@/app/actions/preferences";
import { LOCALE_LABELS, LOCALES, type AppLocale } from "@/i18n/config";

export function LocaleSwitcher({ withLabel = false }: { withLabel?: boolean }) {
  const t = useTranslations("common.language");
  const active = useLocale() as AppLocale;
  const [pending, startTransition] = useTransition();

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size={withLabel ? "sm" : "icon"} aria-label={t("switch")} disabled={pending}>
          <Languages />
          {withLabel ? LOCALE_LABELS[active] : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        {LOCALES.map((locale) => (
          <DropdownItem key={locale} onSelect={() => startTransition(() => void setLocale(locale))}>
            {LOCALE_LABELS[locale]}
            {active === locale ? <span className="ml-auto text-xs text-primary">&#10003;</span> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
