"use client";

import { useLocale, useTranslations } from "next-intl";
import { CrudPanel, type CrudRow } from "@/components/shared/crud-panel";
import { Badge } from "@/components/ui/badge";
import { LOCATION_TYPES } from "./schema";
import {
  deleteAssetCategory,
  deleteLocation,
  deleteVendor,
  saveAssetCategory,
  saveLocation,
  saveVendor,
} from "./actions";

function useActiveColumn() {
  const tc = useTranslations("common");
  return {
    key: "isActive",
    header: tc("labels.status"),
    render: (r: CrudRow) => (
      <Badge tone={r.isActive ? "success" : "neutral"}>
        {r.isActive ? tc("labels.yes") : tc("labels.no")}
      </Badge>
    ),
  };
}

export function CategoryPanel({ rows, canManage }: { rows: CrudRow[]; canManage: boolean }) {
  const t = useTranslations("catalog.categories");
  const tc = useTranslations("common");
  const locale = useLocale();
  const activeColumn = useActiveColumn();

  const label = (r: CrudRow) => (locale === "en" && r.nameEn ? String(r.nameEn) : String(r.name));

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={saveAssetCategory}
      remove={deleteAssetCategory}
      columns={[
        { key: "code", header: tc("labels.code"), render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        { key: "name", header: tc("labels.name"), render: (r) => <span className="font-medium">{label(r)}</span> },
        { key: "parentName", header: t("parent") },
        { key: "defaultUsefulLifeMonths", header: t("defaultUsefulLifeMonths"), align: "right" },
        { key: "defaultWarrantyMonths", header: t("defaultWarrantyMonths"), align: "right" },
        { key: "assetCount", header: t("assetCount"), align: "right" },
        activeColumn,
      ]}
      fields={[
        { kind: "text", name: "code", label: tc("labels.code"), required: true, mono: true },
        { kind: "text", name: "name", label: tc("labels.name"), required: true },
        { kind: "text", name: "nameEn", label: "Name (EN)" },
        {
          kind: "select",
          name: "parentId",
          label: t("parent"),
          options: rows.map((r) => ({ value: r.id, label: label(r) })),
        },
        { kind: "number", name: "defaultUsefulLifeMonths", label: t("defaultUsefulLifeMonths"), step: "1" },
        { kind: "number", name: "defaultWarrantyMonths", label: t("defaultWarrantyMonths"), step: "1" },
        { kind: "checkbox", name: "isActive", label: tc("labels.status"), defaultChecked: true },
      ]}
    />
  );
}

export function LocationPanel({ rows, canManage }: { rows: CrudRow[]; canManage: boolean }) {
  const t = useTranslations("catalog.locations");
  const tc = useTranslations("common");
  const activeColumn = useActiveColumn();

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={saveLocation}
      remove={deleteLocation}
      columns={[
        { key: "code", header: tc("labels.code"), render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        { key: "name", header: tc("labels.name"), render: (r) => <span className="font-medium">{String(r.name)}</span> },
        { key: "type", header: t("type"), render: (r) => t(`types.${String(r.type)}` as never) },
        { key: "parentName", header: t("parent") },
        { key: "address", header: tc("labels.address") },
        { key: "assetCount", header: t("assetCount"), align: "right" },
        activeColumn,
      ]}
      fields={[
        { kind: "text", name: "code", label: tc("labels.code"), required: true, mono: true },
        { kind: "text", name: "name", label: tc("labels.name"), required: true },
        {
          kind: "select",
          name: "type",
          label: t("type"),
          allowEmpty: false,
          options: LOCATION_TYPES.map((x) => ({ value: x, label: t(`types.${x}`) })),
        },
        {
          kind: "select",
          name: "parentId",
          label: t("parent"),
          options: rows.map((r) => ({ value: r.id, label: `${r.code} - ${r.name}` })),
        },
        { kind: "text", name: "address", label: tc("labels.address") },
        { kind: "checkbox", name: "isActive", label: tc("labels.status"), defaultChecked: true },
      ]}
    />
  );
}

export function VendorPanel({ rows, canManage }: { rows: CrudRow[]; canManage: boolean }) {
  const t = useTranslations("catalog.vendors");
  const tc = useTranslations("common");
  const activeColumn = useActiveColumn();

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={saveVendor}
      remove={deleteVendor}
      dialogSize="lg"
      columns={[
        { key: "code", header: tc("labels.code"), render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        { key: "name", header: tc("labels.name"), render: (r) => <span className="font-medium">{String(r.name)}</span> },
        { key: "contactName", header: t("contactName") },
        { key: "phone", header: tc("labels.phone") },
        { key: "email", header: tc("labels.email") },
        {
          key: "roles",
          header: t("isManufacturer"),
          render: (r) => (
            <span className="flex flex-wrap gap-1">
              {r.isManufacturer ? <Badge tone="info">{t("isManufacturer")}</Badge> : null}
              {r.isSupplier ? <Badge tone="primary">{t("isSupplier")}</Badge> : null}
            </span>
          ),
        },
        { key: "assetCount", header: t("assetCount"), align: "right" },
        activeColumn,
      ]}
      fields={[
        { kind: "text", name: "code", label: tc("labels.code"), required: true, mono: true },
        { kind: "text", name: "name", label: tc("labels.name"), required: true },
        { kind: "text", name: "contactName", label: t("contactName") },
        { kind: "text", name: "phone", label: tc("labels.phone") },
        { kind: "text", name: "email", label: tc("labels.email") },
        { kind: "text", name: "taxCode", label: t("taxCode") },
        { kind: "text", name: "website", label: t("website"), placeholder: "https://" },
        { kind: "text", name: "address", label: tc("labels.address") },
        { kind: "checkbox", name: "isManufacturer", label: t("isManufacturer"), defaultChecked: false },
        { kind: "checkbox", name: "isSupplier", label: t("isSupplier"), defaultChecked: true },
        { kind: "textarea", name: "notes", label: tc("labels.notes"), rows: 2 },
        { kind: "checkbox", name: "isActive", label: tc("labels.status"), defaultChecked: true },
      ]}
    />
  );
}
