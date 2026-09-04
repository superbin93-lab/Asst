"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SubmitButton, useActionForm, useActionRunner } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { LICENSE_TYPES } from "@/features/catalog/schema";
import { assignLicenseSeat, deleteLicense, revokeLicenseSeat, saveLicense } from "./actions";

export type LicenseSeatRow = {
  id: string;
  holder: string;
  assignedAt: Date;
};

export type LicenseRow = {
  id: string;
  name: string;
  vendorId: string | null;
  vendorName: string | null;
  licenseKey: string | null;
  type: string;
  seatsTotal: number;
  seatsUsed: number;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  /** Precomputed on the server: rendering must not read the clock. */
  daysToExpiry: number | null;
  cost: string | null;
  currency: string;
  notes: string | null;
  isActive: boolean;
  seats: LicenseSeatRow[];
};

function LicenseKeyCell({ value }: { value: string | null }) {
  const t = useTranslations("catalog.licenses");
  const [shown, setShown] = useState(false);
  if (!value) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="flex items-center gap-1.5">
      <code className="font-mono text-[11px]">{shown ? value : "••••-••••-••••"}</code>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={shown ? t("hideKey") : t("showKey")}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? <EyeOff className="text-muted-foreground" /> : <Eye className="text-muted-foreground" />}
      </Button>
    </span>
  );
}

export function LicensePanel({
  rows,
  vendors,
  employees,
  canManage,
  alertDays,
  locale,
}: {
  rows: LicenseRow[];
  vendors: { id: string; name: string }[];
  employees: { id: string; fullName: string; employeeCode: string }[];
  canManage: boolean;
  alertDays: number;
  locale: AppLocale;
}) {
  const t = useTranslations("catalog.licenses");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LicenseRow | null>(null);
  const [seatTarget, setSeatTarget] = useState<LicenseRow | null>(null);
  const [target, setTarget] = useState<LicenseRow | null>(null);
  const confirm = useConfirmState();
  const { run, pending: running } = useActionRunner();

  const form = useActionForm((formData: FormData) => saveLicense(editing?.id ?? null, formData), {
    successMessage: tc("toast.updated"),
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  const seatForm = useActionForm(assignLicenseSeat, {
    successMessage: tc("toast.updated"),
    onSuccess: () => setSeatTarget(null),
  });

  function openForm(row: LicenseRow | null) {
    form.reset();
    setEditing(row);
    setOpen(true);
  }

  const expiryBadge = (days: number | null) => {
    if (days === null) return null;
    if (days < 0) return <Badge tone="danger">{t("expired")}</Badge>;
    if (days <= alertDays) return <Badge tone="warning">{t("expiringSoon", { days })}</Badge>;
    return null;
  };

  return (
    <>
      {canManage ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus />
            {t("new")}
          </Button>
        </div>
      ) : null}

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{tc("labels.name")}</TH>
              <TH>{t("type")}</TH>
              <TH>{tc("labels.name")}</TH>
              <TH>{t("licenseKey")}</TH>
              <TH className="text-right">{t("seatsUsed")}</TH>
              <TH>{t("expiryDate")}</TH>
              <TH className="text-right">{t("cost")}</TH>
              {canManage ? <TH className="w-10" /> : null}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={canManage ? 8 : 7} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="text-muted-foreground">{t(`types.${row.type}` as never)}</TD>
                  <TD className="text-muted-foreground">{row.vendorName ?? "-"}</TD>
                  <TD>
                    <LicenseKeyCell value={row.licenseKey} />
                  </TD>
                  <TD className="text-right tabular">
                    <span className={row.seatsUsed >= row.seatsTotal ? "text-danger" : undefined}>
                      {row.seatsUsed}/{row.seatsTotal}
                    </span>
                  </TD>
                  <TD>
                    <span className="flex items-center gap-2">
                      <span className="tabular text-xs">{formatDate(row.expiryDate, locale)}</span>
                      {expiryBadge(row.daysToExpiry)}
                    </span>
                  </TD>
                  <TD className="text-right tabular">{formatMoney(row.cost, row.currency, locale)}</TD>
                  {canManage ? (
                    <TD className="text-right">
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button variant="ghost" size="iconSm" aria-label={tc("labels.actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem onSelect={() => setTimeout(() => openForm(row), 0)}>
                            <Pencil />
                            {tc("actions.edit")}
                          </DropdownItem>
                          <DropdownItem
                            disabled={row.seatsUsed >= row.seatsTotal}
                            onSelect={() => setTimeout(() => { seatForm.reset(); setSeatTarget(row); }, 0)}
                          >
                            <UserPlus />
                            {t("assignSeat")}
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            tone="danger"
                            onSelect={() =>
                              setTimeout(() => {
                                setTarget(row);
                                confirm.openDialog();
                              }, 0)
                            }
                          >
                            <Trash2 />
                            {tc("actions.delete")}
                          </DropdownItem>
                        </DropdownContent>
                      </Dropdown>
                    </TD>
                  ) : null}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>

      {rows.some((r) => r.seats.length > 0) ? (
        <div className="space-y-3">
          {rows
            .filter((r) => r.seats.length > 0)
            .map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="mb-2 text-xs font-semibold">
                  {row.name}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {t("assignedTo")} ({row.seats.length})
                  </span>
                </p>
                <ul className="flex flex-wrap gap-2">
                  {row.seats.map((seat) => (
                    <li
                      key={seat.id}
                      className="flex items-center gap-2 rounded-full bg-surface-muted py-1 pl-3 pr-1 text-xs"
                    >
                      {seat.holder}
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="iconSm"
                          className="size-5"
                          disabled={running}
                          aria-label={t("revokeSeat")}
                          onClick={() =>
                            run(() => revokeLicenseSeat(seat.id), { successMessage: tc("toast.updated") })
                          }
                        >
                          <UserMinus className="size-3 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? tc("actions.edit") : t("new")} size="lg">
          <form action={form.onSubmit} key={editing?.id ?? "new"}>
            <DialogBody className="space-y-4">
              {form.formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {form.formError}
                </p>
              ) : null}

              <FieldGroup>
                <Field label={tc("labels.name")} htmlFor="l-name" required error={form.fieldErrors.name}>
                  <Input id="l-name" name="name" required defaultValue={editing?.name ?? ""} />
                </Field>
                <Field label={tc("labels.name")} htmlFor="l-vendor">
                  <NativeSelect id="l-vendor" name="vendorId" defaultValue={editing?.vendorId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("type")} htmlFor="l-type">
                  <NativeSelect id="l-type" name="type" defaultValue={editing?.type ?? "SUBSCRIPTION"}>
                    {LICENSE_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {t(`types.${x}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("seatsTotal")} htmlFor="l-seats" error={form.fieldErrors.seatsTotal}>
                  <Input
                    id="l-seats"
                    name="seatsTotal"
                    type="number"
                    min={1}
                    defaultValue={editing?.seatsTotal ?? 1}
                    className="tabular"
                  />
                </Field>
                <Field label={t("licenseKey")} htmlFor="l-key" className="sm:col-span-2">
                  <Input id="l-key" name="licenseKey" defaultValue={editing?.licenseKey ?? ""} className="font-mono" />
                </Field>
                <Field label={t("purchaseDate")} htmlFor="l-purchase">
                  <Input
                    id="l-purchase"
                    name="purchaseDate"
                    type="date"
                    defaultValue={toDateInputValue(editing?.purchaseDate)}
                  />
                </Field>
                <Field label={t("expiryDate")} htmlFor="l-expiry">
                  <Input
                    id="l-expiry"
                    name="expiryDate"
                    type="date"
                    defaultValue={toDateInputValue(editing?.expiryDate)}
                  />
                </Field>
                <Field label={t("cost")} htmlFor="l-cost">
                  <Input
                    id="l-cost"
                    name="cost"
                    inputMode="numeric"
                    defaultValue={editing?.cost ?? ""}
                    className="tabular"
                  />
                </Field>
                <Field label={tc("labels.notes")} htmlFor="l-notes" className="sm:col-span-2">
                  <Textarea id="l-notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} />
                </Field>
              </FieldGroup>

              <CheckboxRow
                name="isActive"
                value="on"
                defaultChecked={editing?.isActive ?? true}
                label={tc("labels.status")}
              />
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {tc("actions.cancel")}
              </Button>
              <SubmitButton pending={form.pending}>{tc("actions.save")}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={seatTarget !== null} onOpenChange={(o) => !o && setSeatTarget(null)}>
        <DialogContent title={t("assignSeat")} description={seatTarget?.name} size="sm">
          <form action={seatForm.onSubmit}>
            <input type="hidden" name="licenseId" value={seatTarget?.id ?? ""} />
            <DialogBody className="space-y-3">
              {seatForm.formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {seatForm.formError}
                </p>
              ) : null}
              <Field
                label={t("assignedTo")}
                htmlFor="seat-employee"
                required
                error={seatForm.fieldErrors.employeeId}
              >
                <NativeSelect id="seat-employee" name="employeeId" required defaultValue="">
                  <option value="">{tc("labels.selectPlaceholder")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.fullName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={tc("labels.note")} htmlFor="seat-note">
                <Textarea id="seat-note" name="note" rows={2} />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setSeatTarget(null)}>
                {tc("actions.cancel")}
              </Button>
              <SubmitButton pending={seatForm.pending}>{tc("actions.assign")}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title={tc("confirmDelete.title")}
        description={tc("confirmDelete.description", { name: target?.name ?? "" })}
        confirmLabel={tc("confirmDelete.confirm")}
        successMessage={tc("toast.deleted")}
        action={() => deleteLicense(target!.id)}
      />
    </>
  );
}
