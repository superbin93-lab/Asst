"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MaintenanceStatusBadge } from "@/components/shared/status-badge";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES } from "./schema";
import { deleteMaintenance, saveMaintenance } from "./actions";

export type MaintenanceRecord = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  vendorId: string | null;
  vendorName: string | null;
  cost: string | null;
  currency: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
  nextDueAt: Date | null;
  performedBy: string | null;
};

export function MaintenancePanel({
  assetId,
  records,
  vendors,
  canManage,
  locale,
}: {
  assetId: string;
  records: MaintenanceRecord[];
  vendors: { id: string; name: string }[];
  canManage: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("assets.maintenance");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [target, setTarget] = useState<MaintenanceRecord | null>(null);
  const confirm = useConfirmState();

  const { onSubmit, pending, fieldErrors, formError, reset } = useActionForm(
    (formData: FormData) => saveMaintenance(editing?.id ?? null, formData),
    {
      successMessage: tc("toast.updated"),
      onSuccess: () => {
        setOpen(false);
        setEditing(null);
      },
    },
  );

  function openForm(record: MaintenanceRecord | null) {
    reset();
    setEditing(record);
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {canManage ? (
          <Button size="sm" variant="secondary" onClick={() => openForm(null)}>
            <Plus />
            {t("new")}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        <TableWrap className="rounded-none border-0">
          <Table>
            <THead>
              <TR>
                <TH>{tc("labels.name")}</TH>
                <TH>{t("type")}</TH>
                <TH>{tc("labels.status")}</TH>
                <TH>{t("vendor")}</TH>
                <TH className="text-right">{t("cost")}</TH>
                <TH>{t("completedAt")}</TH>
                {canManage ? <TH className="w-10" /> : null}
              </TR>
            </THead>
            <TBody>
              {records.length === 0 ? (
                <TableEmpty colSpan={canManage ? 7 : 6} title={tc("table.empty")} />
              ) : (
                records.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => openForm(m)}
                          className="text-left font-medium hover:underline"
                        >
                          {m.title}
                        </button>
                      ) : (
                        <span className="font-medium">{m.title}</span>
                      )}
                      {m.description ? (
                        <span className="mt-0.5 block max-w-md truncate text-xs text-muted-foreground">
                          {m.description}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="text-muted-foreground">{t(`types.${m.type}`)}</TD>
                    <TD>
                      <MaintenanceStatusBadge status={m.status} />
                    </TD>
                    <TD className="text-muted-foreground">{m.vendorName ?? "-"}</TD>
                    <TD className="text-right tabular">{formatMoney(m.cost, m.currency, locale)}</TD>
                    <TD className="tabular">{formatDate(m.completedAt ?? m.scheduledAt, locale)}</TD>
                    {canManage ? (
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          aria-label={tc("actions.delete")}
                          onClick={() => {
                            setTarget(m);
                            confirm.openDialog();
                          }}
                        >
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      </TD>
                    ) : null}
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </TableWrap>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? tc("actions.edit") : t("new")} size="lg">
          <form action={onSubmit}>
            <input type="hidden" name="assetId" value={assetId} />
            <DialogBody className="space-y-4">
              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {formError}
                </p>
              ) : null}

              <Field label={tc("labels.name")} htmlFor="m-title" required error={fieldErrors.title}>
                <Input id="m-title" name="title" defaultValue={editing?.title ?? ""} required />
              </Field>

              <FieldGroup>
                <Field label={t("type")} htmlFor="m-type">
                  <NativeSelect id="m-type" name="type" defaultValue={editing?.type ?? "REPAIR"}>
                    {MAINTENANCE_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {t(`types.${v}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={tc("labels.status")} htmlFor="m-status">
                  <NativeSelect id="m-status" name="status" defaultValue={editing?.status ?? "SCHEDULED"}>
                    {MAINTENANCE_STATUSES.map((v) => (
                      <option key={v} value={v}>
                        {t(`statuses.${v}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("vendor")} htmlFor="m-vendor">
                  <NativeSelect id="m-vendor" name="vendorId" defaultValue={editing?.vendorId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("cost")} htmlFor="m-cost" error={fieldErrors.cost}>
                  <Input
                    id="m-cost"
                    name="cost"
                    inputMode="numeric"
                    defaultValue={editing?.cost ?? ""}
                    className="tabular"
                  />
                </Field>
                <Field label={t("scheduledAt")} htmlFor="m-scheduledAt">
                  <Input
                    id="m-scheduledAt"
                    name="scheduledAt"
                    type="date"
                    defaultValue={toDateInputValue(editing?.scheduledAt)}
                  />
                </Field>
                <Field label={t("completedAt")} htmlFor="m-completedAt">
                  <Input
                    id="m-completedAt"
                    name="completedAt"
                    type="date"
                    defaultValue={toDateInputValue(editing?.completedAt)}
                  />
                </Field>
                <Field label={t("nextDueAt")} htmlFor="m-nextDueAt">
                  <Input
                    id="m-nextDueAt"
                    name="nextDueAt"
                    type="date"
                    defaultValue={toDateInputValue(editing?.nextDueAt)}
                  />
                </Field>
                <Field label={t("performedBy")} htmlFor="m-performedBy">
                  <Input id="m-performedBy" name="performedBy" defaultValue={editing?.performedBy ?? ""} />
                </Field>
              </FieldGroup>

              <Field label={tc("labels.description")} htmlFor="m-description">
                <Textarea id="m-description" name="description" rows={3} defaultValue={editing?.description ?? ""} />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {tc("actions.cancel")}
              </Button>
              <SubmitButton pending={pending}>{tc("actions.save")}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title={tc("confirmDelete.title")}
        description={tc("confirmDelete.description", { name: target?.title ?? "" })}
        confirmLabel={tc("confirmDelete.confirm")}
        successMessage={tc("toast.deleted")}
        action={() => deleteMaintenance(target!.id)}
      />
    </Card>
  );
}
