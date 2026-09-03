"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";

export function BalanceFilters({ departments }: { departments: { value: string; label: string }[] }) {
  const t = useTranslations("leave");
  const tc = useTranslations("common");
  const currentYear = new Date().getFullYear();
  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <FilterBar>
      <SearchField placeholder={tc("labels.searchPlaceholder")} />
      <FilterSelect paramKey="department" label={tc("labels.department")} options={departments} />
      <FilterSelect
        paramKey="year"
        label={t("balance.year")}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
        className="sm:w-32"
      />
    </FilterBar>
  );
}
