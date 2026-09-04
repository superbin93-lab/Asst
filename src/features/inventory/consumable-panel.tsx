"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpFromLine, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { formatMoney } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { deleteConsumable, recordStockMovement, saveConsumable } from "./actions";

export type ConsumableRow = {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  locationId: string | null;
  locationName: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost: string | null;
  currency: string;
  notes: string | null;
  isActive: boolean;
};

export function ConsumablePanel({
  rows,
  categories,
  locations,
  employees,
  canManage,
  locale,
}: {
  rows: ConsumableRow[];
  categories: { id: string; label: string }[];
  locations: { id: string; label: string }[];
  employees: { id: string; fullName: string; employeeCode: string }[];
  canManage: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("catalog.consumables");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConsumableRow | null>(null);
  const [movement, setMovement] = useState<{ row: ConsumableRow; type: "IN" | "OUT" } | null>(null);
  const [target, setTarget] = useState<ConsumableRow | null>(null);
  const confirm = useConfirmState();

  const form = useActionForm((formData: FormData) => saveConsumable(editing?.id ?? null, formData), {
    successMessage: tc("toast.updated"),
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  const stockForm = useActionForm(recordStockMovement, {
    successMessage: tc("toast.updated"),
    onSuccess: () => setMovement(null),
  });

  return (
    <>
      {canManage ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              form.reset();
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus />
            {t("new")}
          </Button>
        </div>
      ) : null}

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{tc("labels.code")}</TH>
              <TH>{tc("labels.name")}</TH>
              <TH>{tc("labels.location")}</TH>
              <TH>{t("unit")}</TH>
              <TH className="text-right">{t("quantity")}</TH>
              <TH className="text-right">{t("minQuantity")}</TH>
              <TH className="text-right">{t("unitCost")}</TH>
              {canManage ? <TH className="w-10" /> : null}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={canManage ? 8 : 7} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((row) => {
                const low = row.quantity <= row.minQuantity;
                return (
                  <TR key={row.id}>
                    <TD className="font-mono text-xs">{row.code}</TD>
                    <TD>
                      <span className="font-medium">{row.name}</span>
                      {row.categoryName ? (
                        <span className="ml-2 text-xs text-muted-foreground">{row.categoryName}</span>
                      ) : null}
                    </TD>
                    <TD className="text-muted-foreground">{row.locationName ?? "-"}</TD>
                    <TD className="text-muted-foreground">{row.unit}</TD>
                    <TD className="text-right">
                      <span className="inline-flex items-center gap-2">
                        <span className="tabular font-medium">{row.quantity}</span>
                        {low ? <Badge tone="warning">{t("belowMinimum")}</Badge> : null}
                      </span>
                    </TD>
                    <TD className="text-right tabular text-muted-foreground">{row.minQuantity}</TD>
                    <TD className="text-right tabular">{formatMoney(row.unitCost, row.currency, locale)}</TD>
                    {canManage ? (
                      <TD className="text-right">
                        <Dropdown>
                          <DropdownTrigger asChild>
                            <Button variant="ghost" size="iconSm" aria-label={tc("labels.actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownTrigger>
                          <DropdownContent>
                            <DropdownItem onSelect={() => setTimeout(() => { stockForm.reset(); setMovement({ row, type: "IN" }); }, 0)}>
                              <ArrowDownToLine />
                              {t("stockIn")}
                            </DropdownItem>
                            <DropdownItem
                              disabled={row.quantity === 0}
                              onSelect={() => setTimeout(() => { stockForm.reset(); setMovement({ row, type: "OUT" }); }, 0)}
                            >
                              <ArrowUpFromLine />
                              {t("stockOut")}
                            </DropdownItem>
                            <DropdownSeparator />
                            <DropdownItem
                              onSelect={() =>
                                setTimeout(() => {
                                  form.reset();
                                  setEditing(row);
                                  setOpen(true);
                                }, 0)
                              }
                            >
                              <Pencil />
                              {tc("actions.edit")}
                            </DropdownItem>
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
                );
              })
            )}
          </TBody>
        </Table>
      </TableWrap>

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
                <Field label={tc("labels.code")} htmlFor="c-code" error={form.fieldErrors.code}>
                  <Input id="c-code" name="code" defaultValue={editing?.code ?? ""} className="font-mono" />
                </Field>
                <Field label={tc("labels.name")} htmlFor="c-name" required error={form.fieldErrors.name}>
                  <Input id="c-name" name="name" required defaultValue={editing?.name ?? ""} />
                </Field>
                <Field label={tc("labels.name")} htmlFor="c-category">
                  <NativeSelect id="c-category" name="categoryId" defaultValue={editing?.categoryId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={tc("labels.location")} htmlFor="c-location">
                  <NativeSelect id="c-location" name="locationId" defaultValue={editing?.locationId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("unit")} htmlFor="c-unit" required>
                  <Input id="c-unit" name="unit" required defaultValue={editing?.unit ?? "PCS"} />
                </Field>
                <Field label={t("minQuantity")} htmlFor="c-min" error={form.fieldErrors.minQuantity}>
                  <Input
                    id="c-min"
                    name="minQuantity"
                    type="number"
                    min={0}
                    defaultValue={editing?.minQuantity ?? 0}
                    className="tabular"
                  />
                </Field>
                <Field label={t("unitCost")} htmlFor="c-cost">
                  <Input
                    id="c-cost"
                    name="unitCost"
                    inputMode="numeric"
                    defaultValue={editing?.unitCost ?? ""}
                    className="tabular"
                  />
                </Field>
                <Field label={tc("labels.notes")} htmlFor="c-notes" className="sm:col-span-2">
                  <Textarea id="c-notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} />
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

      <Dialog open={movement !== null} onOpenChange={(o) => !o && setMovement(null)}>
        <DialogContent
          title={movement?.type === "OUT" ? t("stockOut") : t("stockIn")}
          description={movement ? `${movement.row.code} - ${movement.row.name}` : undefined}
          size="sm"
        >
          <form action={stockForm.onSubmit} key={`${movement?.row.id}-${movement?.type}`}>
            <input type="hidden" name="consumableId" value={movement?.row.id ?? ""} />
            <input type="hidden" name="type" value={movement?.type ?? "IN"} />
            <DialogBody className="space-y-3">
              {stockForm.formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {stockForm.formError}
                </p>
              ) : null}

              <Field
                label={t("quantity")}
                htmlFor="s-quantity"
                required
                hint={movement ? `${t("balanceAfter")}: ${movement.row.quantity}` : undefined}
                error={stockForm.fieldErrors.quantity}
              >
                <Input
                  id="s-quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  required
                  defaultValue={1}
                  className="tabular"
                />
              </Field>

              {movement?.type === "OUT" ? (
                <Field label={t("issuedTo")} htmlFor="s-employee">
                  <NativeSelect id="s-employee" name="employeeId" defaultValue="">
                    <option value="">{tc("labels.notSet")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} - {e.fullName}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}

              <Field label={tc("labels.note")} htmlFor="s-note">
                <Textarea id="s-note" name="note" rows={2} />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setMovement(null)}>
                {tc("actions.cancel")}
              </Button>
              <SubmitButton pending={stockForm.pending}>{tc("actions.confirm")}</SubmitButton>
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
        action={() => deleteConsumable(target!.id)}
      />
    </>
  );
}
