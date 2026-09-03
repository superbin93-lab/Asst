"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES } from "./schema";

export function MaintenanceFilters() {
  const t = useTranslations("assets.maintenance");
  const tc = useTranslations("common");

  return (
    <FilterBar>
      <SearchField placeholder={tc("labels.searchPlaceholder")} />
      <FilterSelect
        paramKey="status"
        label={tc("labels.status")}
        options={MAINTENANCE_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))}
      />
      <FilterSelect
        paramKey="type"
        label={t("type")}
        options={MAINTENANCE_TYPES.map((s) => ({ value: s, label: t(`types.${s}`) }))}
      />
    </FilterBar>
  );
}
