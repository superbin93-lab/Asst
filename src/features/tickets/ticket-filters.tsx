"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterSelect, SearchField } from "@/components/shared/filter-bar";

type Option = { value: string; label: string };

export function TicketFilters({
  categories,
  agents,
  statuses,
  priorities,
  showAssignee,
}: {
  categories: Option[];
  agents: Option[];
  statuses: Option[];
  priorities: Option[];
  showAssignee: boolean;
}) {
  const t = useTranslations("tickets");

  return (
    <FilterBar>
      <SearchField placeholder={t("filters.keyword")} />
      <FilterSelect
        paramKey="status"
        label={t("fields.status")}
        options={[{ value: "open", label: t("status.OPEN") }, ...statuses]}
      />
      <FilterSelect paramKey="priority" label={t("fields.priority")} options={priorities} />
      <FilterSelect paramKey="category" label={t("fields.category")} options={categories} />
      {showAssignee ? (
        <FilterSelect
          paramKey="assignee"
          label={t("fields.assignee")}
          options={[
            { value: "me", label: t("assignedToMe") },
            { value: "none", label: t("filters.unassigned") },
            ...agents,
          ]}
        />
      ) : null}
      <FilterSelect
        paramKey="sla"
        label={t("sla.title")}
        options={[{ value: "breached", label: t("sla.breached") }]}
        className="sm:w-40"
      />
    </FilterBar>
  );
}
