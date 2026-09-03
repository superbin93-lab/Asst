"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";
import { CONTRACT_STATUSES } from "./schema";

export function ContractFilters() {
  const t = useTranslations("hr.contracts");
  const tc = useTranslations("common");

  return (
    <FilterBar>
      <SearchField placeholder={t("contractNo")} />
      <FilterSelect
        paramKey="status"
        label={tc("labels.status")}
        options={CONTRACT_STATUSES.map((x) => ({ value: x, label: t(`statuses.${x}`) }))}
      />
      <FilterSelect
        paramKey="expiring"
        label={t("expiringSoon", { days: 60 })}
        options={[{ value: "1", label: t("expiringSoon", { days: 60 }) }]}
        className="sm:w-56"
      />
    </FilterBar>
  );
}
