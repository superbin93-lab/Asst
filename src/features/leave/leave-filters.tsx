"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";
import { REQUEST_STATUSES } from "./schema";

type Option = { value: string; label: string };

export function LeaveFilters({
  types,
  departments,
}: {
  types: Option[];
  departments: Option[];
}) {
  const t = useTranslations("leave");
  const currentYear = new Date().getFullYear();
  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <FilterBar>
      <SearchField placeholder={t("fields.reason")} />
      <FilterSelect
        paramKey="status"
        label={t("fields.status")}
        options={REQUEST_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
      />
      <FilterSelect paramKey="type" label={t("fields.leaveType")} options={types} />
      {departments.length > 0 ? (
        <FilterSelect paramKey="department" label={t("fields.employee")} options={departments} />
      ) : null}
      <FilterSelect
        paramKey="year"
        label={t("balance.year")}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
        className="sm:w-32"
      />
    </FilterBar>
  );
}
