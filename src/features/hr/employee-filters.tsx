"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "./schema";

type Option = { value: string; label: string };

export function EmployeeFilters({
  departments,
  positions,
}: {
  departments: Option[];
  positions: Option[];
}) {
  const t = useTranslations("hr.employees");

  return (
    <FilterBar>
      <SearchField placeholder={t("fields.fullName")} />
      <FilterSelect paramKey="department" label={t("fields.department")} options={departments} />
      <FilterSelect paramKey="position" label={t("fields.position")} options={positions} />
      <FilterSelect
        paramKey="type"
        label={t("fields.employmentType")}
        options={EMPLOYMENT_TYPES.map((x) => ({ value: x, label: t(`employmentType.${x}`) }))}
      />
      <FilterSelect
        paramKey="status"
        label={t("fields.status")}
        options={EMPLOYEE_STATUSES.map((x) => ({ value: x, label: t(`status.${x}`) }))}
      />
    </FilterBar>
  );
}
