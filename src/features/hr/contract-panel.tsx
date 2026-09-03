"use client";

import { useTranslations } from "next-intl";
import { CrudPanel, type CrudColumn, type CrudRow } from "@/components/shared/crud-panel";
import { ContractStatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "./schema";
import { deleteContract, saveContract } from "./actions";

export function ContractPanel({
  rows,
  employees,
  canManage,
  canSeeSalary,
  locale,
}: {
  rows: CrudRow[];
  employees: { id: string; fullName: string; employeeCode: string }[];
  canManage: boolean;
  canSeeSalary: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("hr.contracts");
  const tc = useTranslations("common");

  const columns: CrudColumn[] = [
    {
      key: "contractNo",
      header: t("contractNo"),
      render: (r) => <span className="font-mono text-xs">{String(r.contractNo)}</span>,
    },
    {
      key: "employeeName",
      header: tc("labels.name"),
      render: (r) => <span className="font-medium">{String(r.employeeName)}</span>,
    },
    { key: "type", header: t("type"), render: (r) => t(`types.${String(r.type)}` as never) },
    {
      key: "startDate",
      header: t("startDate"),
      render: (r) => <span className="tabular">{formatDate(r.startDate as Date, locale)}</span>,
    },
    {
      key: "endDate",
      header: t("endDate"),
      render: (r) => <span className="tabular">{formatDate(r.endDate as Date | null, locale)}</span>,
    },
    ...(canSeeSalary
      ? [
          {
            key: "baseSalary",
            header: t("baseSalary"),
            align: "right" as const,
            render: (r: CrudRow) => formatMoney(r.baseSalary as string | null, String(r.currency), locale),
          },
        ]
      : []),
    {
      key: "status",
      header: tc("labels.status"),
      render: (r) => <ContractStatusBadge status={String(r.status)} />,
    },
  ];

  return (
    <CrudPanel
      title={t("title")}
      newLabel={t("new")}
      canManage={canManage}
      rows={rows}
      save={saveContract}
      remove={deleteContract}
      dialogSize="lg"
      columns={columns}
      fields={[
        {
          kind: "select",
          name: "employeeId",
          label: tc("labels.name"),
          required: true,
          options: employees.map((e) => ({ value: e.id, label: `${e.employeeCode} - ${e.fullName}` })),
        },
        { kind: "text", name: "contractNo", label: t("contractNo"), required: true, mono: true },
        {
          kind: "select",
          name: "type",
          label: t("type"),
          allowEmpty: false,
          options: CONTRACT_TYPES.map((x) => ({ value: x, label: t(`types.${x}`) })),
        },
        {
          kind: "select",
          name: "status",
          label: tc("labels.status"),
          allowEmpty: false,
          options: CONTRACT_STATUSES.map((x) => ({ value: x, label: t(`statuses.${x}`) })),
        },
        { kind: "date", name: "startDate", label: t("startDate"), required: true },
        { kind: "date", name: "endDate", label: t("endDate") },
        ...(canSeeSalary
          ? ([{ kind: "number", name: "baseSalary", label: t("baseSalary"), step: "1000" }] as const)
          : []),
        { kind: "date", name: "signedAt", label: t("signedAt") },
        { kind: "textarea", name: "notes", label: tc("labels.notes"), rows: 2 },
      ]}
    />
  );
}
