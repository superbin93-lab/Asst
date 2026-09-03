"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";

export function ConsumableFilters({ locations }: { locations: { value: string; label: string }[] }) {
  const tc = useTranslations("common");

  return (
    <FilterBar>
      <SearchField placeholder={tc("labels.searchPlaceholder")} />
      <FilterSelect paramKey="location" label={tc("labels.location")} options={locations} />
    </FilterBar>
  );
}
