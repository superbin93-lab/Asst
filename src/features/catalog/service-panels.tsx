"use client";

import { useLocale, useTranslations } from "next-intl";
import { CrudPanel, type CrudRow } from "@/components/shared/crud-panel";
import { Badge } from "@/components/ui/badge";
import { TicketPriorityBadge } from "@/components/shared/status-badge";
import { formatDate, formatDuration } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { TICKET_PRIORITIES } from "@/features/tickets/schema";
import {
  deleteHoliday,
  deleteLeaveType,
  deleteSlaPolicy,
  deleteTicketCategory,
  saveHoliday,
  saveLeaveType,
  saveSlaPolicy,
  saveTicketCategory,
} from "./actions";

const yesNo = (value: unknown, yes: string, no: string) => (value ? yes : no);

export function TicketCategoryPanel({
  rows,
  slaPolicies,
  canManage,
}: {
  rows: CrudRow[];
  slaPolicies: { id: string; label: string }[];
  canManage: boolean;
}) {
  const t = useTranslations("tickets.categories");
  const tc = useTranslations("common");
  const locale = useLocale();

  const label = (r: CrudRow) => (locale === "en" && r.nameEn ? String(r.nameEn) : String(r.name));

  return (
    <CrudPanel
      title={t("title")}
      newLabel={tc("actions.create")}
      canManage={canManage}
      rows={rows}
      save={saveTicketCategory}
      remove={deleteTicketCategory}
      columns={[
        { key: "code", header: tc("labels.code"), render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        { key: "name", header: tc("labels.name"), render: (r) => <span className="font-medium">{label(r)}</span> },
        { key: "slaName", header: t("slaPolicy") },
        { key: "ticketCount", header: tc("labels.total"), align: "right" },
        {
          key: "isActive",
          header: tc("labels.status"),
          render: (r) => (
            <Badge tone={r.isActive ? "success" : "neutral"}>
              {yesNo(r.isActive, tc("labels.yes"), tc("labels.no"))}
            </Badge>
          ),
        },
      ]}
      fields={[
        { kind: "text", name: "code", label: tc("labels.code"), required: true, mono: true },
        { kind: "text", name: "name", label: tc("labels.name"), required: true },
        { kind: "text", name: "nameEn", label: "Name (EN)" },
        {
          kind: "select",
          name: "parentId",
          label: tc("labels.name"),
          options: rows.map((r) => ({ value: r.id, label: label(r) })),
        },
        {
          kind: "select",
          name: "slaPolicyId",
          label: t("slaPolicy"),
          options: slaPolicies.map((s) => ({ value: s.id, label: s.label })),
        },
        { kind: "checkbox", name: "isActive", label: tc("labels.status"), defaultChecked: true },
      ]}
    />
  );
}

export function SlaPanel({ rows, canManage, locale }: { rows: CrudRow[]; canManage: boolean; locale: AppLocale }) {
  const t = useTranslations("tickets.sla");
  const tt = useTranslations("tickets");
  const tc = useTranslations("common");

  return (
    <CrudPanel
      title={t("title")}
      newLabel={tc("actions.create")}
      canManage={canManage}
      rows={rows}
      save={saveSlaPolicy}
      remove={deleteSlaPolicy}
      columns={[
        { key: "name", header: tc("labels.name"), render: (r) => <span className="font-medium">{String(r.name)}</span> },
        {
          key: "priority",
          header: tt("fields.priority"),
          render: (r) => <TicketPriorityBadge priority={String(r.priority)} />,
        },
        {
          key: "responseMinutes",
          header: t("responseTime"),
          align: "right",
          render: (r) => formatDuration(Number(r.responseMinutes), locale),
        },
        {
          key: "resolutionMinutes",
          header: t("resolutionTime"),
          align: "right",
          render: (r) => formatDuration(Number(r.resolutionMinutes), locale),
        },
        {
          key: "businessHoursOnly",
          header: t("businessHoursOnly"),
          render: (r) => (
            <Badge tone={r.businessHoursOnly ? "info" : "neutral"}>
              {yesNo(r.businessHoursOnly, tc("labels.yes"), tc("labels.no"))}
            </Badge>
          ),
        },
        { key: "categoryCount", header: tc("labels.total"), align: "right" },
      ]}
      fields={[
        { kind: "text", name: "name", label: tc("labels.name"), required: true },
        {
          kind: "select",
          name: "priority",
          label: tt("fields.priority"),
          allowEmpty: false,
          options: TICKET_PRIORITIES.map((p) => ({ value: p, label: tt(`priority.${p}`) })),
        },
        { kind: "number", name: "responseMinutes", label: `${t("responseTime")} (${t("minutes")})`, step: "1" },
        { kind: "number", name: "resolutionMinutes", label: `${t("resolutionTime")} (${t("minutes")})`, step: "1" },
        { kind: "checkbox", name: "businessHoursOnly", label: t("businessHoursOnly"), defaultChecked: true },
      ]}
    />
  );
}

export function LeaveTypePanel({ rows, canManage }: { rows: CrudRow[]; canManage: boolean }) {
  const t = useTranslations("leave.types");
  const tc = useTranslations("common");
  const locale = useLocale();

  const label = (r: CrudRow) => (locale === "en" && r.nameEn ? String(r.nameEn) : String(r.name));

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={saveLeaveType}
      remove={deleteLeaveType}
      dialogSize="lg"
      columns={[
        { key: "code", header: tc("labels.code"), render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        {
          key: "name",
          header: tc("labels.name"),
          render: (r) => (
            <span className="flex items-center gap-2 font-medium">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: String(r.color) }} aria-hidden />
              {label(r)}
            </span>
          ),
        },
        { key: "defaultDaysPerYear", header: t("defaultDaysPerYear"), align: "right" },
        {
          key: "isPaid",
          header: t("isPaid"),
          render: (r) => (
            <Badge tone={r.isPaid ? "success" : "neutral"}>
              {yesNo(r.isPaid, tc("labels.yes"), tc("labels.no"))}
            </Badge>
          ),
        },
        {
          key: "deductsBalance",
          header: t("deductsBalance"),
          render: (r) => yesNo(r.deductsBalance, tc("labels.yes"), tc("labels.no")),
        },
        { key: "carryOverLimitDays", header: t("carryOverLimitDays"), align: "right" },
        { key: "requestCount", header: tc("labels.total"), align: "right" },
      ]}
      fields={[
        { kind: "text", name: "code", label: tc("labels.code"), required: true, mono: true },
        { kind: "text", name: "name", label: tc("labels.name"), required: true },
        { kind: "text", name: "nameEn", label: "Name (EN)" },
        { kind: "color", name: "color", label: t("color") },
        { kind: "number", name: "defaultDaysPerYear", label: t("defaultDaysPerYear"), step: "0.5" },
        { kind: "number", name: "carryOverLimitDays", label: t("carryOverLimitDays"), step: "0.5" },
        { kind: "text", name: "carryOverExpiry", label: t("carryOverExpiry"), placeholder: "03-31" },
        { kind: "number", name: "maxConsecutiveDays", label: t("maxConsecutiveDays"), step: "1" },
        { kind: "number", name: "minNoticeDays", label: t("minNoticeDays"), step: "1" },
        { kind: "checkbox", name: "isPaid", label: t("isPaid"), defaultChecked: true },
        { kind: "checkbox", name: "allowHalfDay", label: t("allowHalfDay"), defaultChecked: true },
        { kind: "checkbox", name: "requiresAttachment", label: t("requiresAttachment"), defaultChecked: false },
        { kind: "checkbox", name: "deductsBalance", label: t("deductsBalance"), defaultChecked: true },
        { kind: "checkbox", name: "isActive", label: tc("labels.status"), defaultChecked: true },
      ]}
    />
  );
}

export function HolidayPanel({
  rows,
  canManage,
  locale,
}: {
  rows: CrudRow[];
  canManage: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("leave.holidays");
  const tc = useTranslations("common");

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={saveHoliday}
      remove={deleteHoliday}
      dialogSize="sm"
      columns={[
        {
          key: "date",
          header: t("date"),
          render: (r) => <span className="tabular">{formatDate(r.date as Date, locale)}</span>,
        },
        { key: "name", header: t("name"), render: (r) => <span className="font-medium">{String(r.name)}</span> },
        {
          key: "isRecurring",
          header: t("isRecurring"),
          render: (r) => (
            <Badge tone={r.isRecurring ? "info" : "neutral"}>
              {yesNo(r.isRecurring, tc("labels.yes"), tc("labels.no"))}
            </Badge>
          ),
        },
        {
          key: "isHalfDay",
          header: t("isHalfDay"),
          render: (r) => yesNo(r.isHalfDay, tc("labels.yes"), tc("labels.no")),
        },
      ]}
      fields={[
        { kind: "date", name: "date", label: t("date"), required: true },
        { kind: "text", name: "name", label: t("name"), required: true },
        { kind: "text", name: "nameEn", label: "Name (EN)" },
        { kind: "checkbox", name: "isRecurring", label: t("isRecurring"), defaultChecked: false },
        { kind: "checkbox", name: "isHalfDay", label: t("isHalfDay"), defaultChecked: false },
      ]}
    />
  );
}
