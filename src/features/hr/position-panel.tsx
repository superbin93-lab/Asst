"use client";

import { useLocale, useTranslations } from "next-intl";
import { CrudPanel, type CrudRow } from "@/components/shared/crud-panel";
import { Badge } from "@/components/ui/badge";
import { deletePosition, savePosition } from "./actions";

export function PositionPanel({ rows, canManage }: { rows: CrudRow[]; canManage: boolean }) {
  const t = useTranslations("hr.positions");
  const tc = useTranslations("common");
  const locale = useLocale();

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={savePosition}
      remove={deletePosition}
      columns={[
        { key: "code", header: tc("labels.code"), render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        {
          key: "title",
          header: t("titleField"),
          render: (r) => (
            <span className="font-medium">
              {locale === "en" && r.titleEn ? String(r.titleEn) : String(r.title)}
            </span>
          ),
        },
        { key: "level", header: t("level"), align: "right" },
        { key: "employeeCount", header: tc("labels.total"), align: "right" },
        {
          key: "isActive",
          header: tc("labels.status"),
          render: (r) => (
            <Badge tone={r.isActive ? "success" : "neutral"}>
              {r.isActive ? tc("labels.yes") : tc("labels.no")}
            </Badge>
          ),
        },
      ]}
      fields={[
        { kind: "text", name: "code", label: tc("labels.code"), required: true, mono: true },
        { kind: "text", name: "title", label: t("titleField"), required: true },
        { kind: "text", name: "titleEn", label: "Title (EN)" },
        { kind: "number", name: "level", label: t("level"), step: "1" },
        { kind: "checkbox", name: "isActive", label: tc("labels.status"), defaultChecked: true },
      ]}
    />
  );
}
