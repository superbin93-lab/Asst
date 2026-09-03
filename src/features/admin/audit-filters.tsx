"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";

const ACTIONS = [
  "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "ASSIGN", "RETURN", "APPROVE", "REJECT", "EXPORT",
] as const;

export function AuditFilters({ entityTypes }: { entityTypes: string[] }) {
  const t = useTranslations("admin.audit");
  const tc = useTranslations("common");

  return (
    <FilterBar>
      <SearchField placeholder={tc("labels.searchPlaceholder")} />
      <FilterSelect
        paramKey="action"
        label={t("action")}
        options={ACTIONS.map((a) => ({ value: a, label: t(`actions.${a}`) }))}
      />
      <FilterSelect
        paramKey="entity"
        label={t("entity")}
        options={entityTypes.map((e) => ({ value: e, label: e }))}
      />
    </FilterBar>
  );
}
