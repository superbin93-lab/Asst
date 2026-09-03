"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Filters live in the URL so a filtered view is shareable and the server
 * component can read them directly. Every control writes through this hook.
 */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) params.delete(key);
      else params.set(key, value);
      if (key !== "page") params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }, [pathname, router]);

  return { searchParams, setParam, clearAll, pending };
}

export function SearchField({ placeholder, paramKey = "q" }: { placeholder: string; paramKey?: string }) {
  const { searchParams, setParam, pending } = useFilterParams();
  const urlValue = searchParams.get(paramKey) ?? "";
  const [value, setValue] = useState(urlValue);
  const [syncedValue, setSyncedValue] = useState(urlValue);

  // When the URL changes from elsewhere ("clear all", a stat-card link), adopt it
  // during render rather than in an effect, so there is no extra paint.
  if (urlValue !== syncedValue) {
    setSyncedValue(urlValue);
    setValue(urlValue);
  }

  // Debounce so each keystroke does not trigger a server round-trip.
  useEffect(() => {
    if (value === urlValue) return;
    const id = setTimeout(() => setParam(paramKey, value || undefined), 350);
    return () => clearTimeout(id);
  }, [value, urlValue, paramKey, setParam]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8"
      />
      {pending ? (
        <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({
  paramKey,
  label,
  options,
  className,
}: {
  paramKey: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const { searchParams, setParam } = useFilterParams();
  const value = searchParams.get(paramKey) ?? "";
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(e) => setParam(paramKey, e.target.value || undefined)}
      className={cn("w-full sm:w-44", value && "border-primary text-primary", className)}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useTranslations("common.actions");
  const { searchParams, clearAll } = useFilterParams();
  const active = Array.from(searchParams.keys()).filter((k) => k !== "page" && k !== "perPage" && k !== "sort");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {active.length > 0 ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X />
          {t("clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
