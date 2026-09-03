"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";

export function AssignmentFilters({ departments }: { departments: { value: string; label: string }[] }) {
  const t = useTranslations("assets.assignment");
  const tc = useTranslations("common");

  return (
    <FilterBar>
      <SearchField placeholder={tc("labels.searchPlaceholder")} />
      <FilterSelect
        paramKey="status"
        label={tc("labels.status")}
        options={[
          { value: "ACTIVE", label: t("status.ACTIVE") },
          { value: "RETURNED", label: t("status.RETURNED") },
        ]}
      />
      <FilterSelect paramKey="department" label={tc("labels.department")} options={departments} />
    </FilterBar>
  );
}
