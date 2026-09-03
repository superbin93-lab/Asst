"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";

type Option = { value: string; label: string };

export function AssetFilters({
  categories,
  locations,
  statuses,
}: {
  categories: Option[];
  locations: Option[];
  statuses: Option[];
}) {
  const t = useTranslations("assets");

  return (
    <FilterBar>
      <SearchField placeholder={t("filters.keyword")} />
      <FilterSelect paramKey="status" label={t("filters.status")} options={statuses} />
      <FilterSelect paramKey="category" label={t("filters.category")} options={categories} />
      <FilterSelect paramKey="location" label={t("filters.location")} options={locations} />
      <FilterSelect
        paramKey="warranty"
        label={t("fields.warrantyEndAt")}
        options={[
          { value: "expiring", label: t("filters.warrantyExpiring") },
          { value: "expired", label: t("warranty.expired") },
        ]}
        className="sm:w-48"
      />
    </FilterBar>
  );
}
