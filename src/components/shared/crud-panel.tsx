"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import type { ActionResult } from "@/lib/action";

export type CrudRow = { id: string; label: string } & Record<string, unknown>;

export type CrudField =
  | { kind: "text"; name: string; label: string; required?: boolean; hint?: string; mono?: boolean; placeholder?: string }
  | { kind: "textarea"; name: string; label: string; rows?: number; wide?: true }
  | { kind: "number"; name: string; label: string; step?: string; hint?: string }
  | { kind: "date"; name: string; label: string; required?: boolean }
  | { kind: "color"; name: string; label: string }
  | { kind: "checkbox"; name: string; label: string; hint?: string; defaultChecked?: boolean }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[]; required?: boolean; allowEmpty?: boolean };

export type CrudColumn = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: CrudRow) => ReactNode;
};

/**
 * Table + create/edit dialog for the small reference entities (positions,
 * categories, locations, leave types, holidays, ...). Field descriptors keep
 * every one of those screens to a few lines of configuration.
 */
export function CrudPanel({
  rows,
  columns,
  fields,
  title,
  newLabel,
  canManage,
  save,
  remove,
  dialogSize = "md",
}: {
  rows: CrudRow[];
  columns: CrudColumn[];
  fields: CrudField[];
  title: string;
  newLabel: string;
  canManage: boolean;
  save: (id: string | null, formData: FormData) => Promise<ActionResult<{ id: string }>>;
  remove?: (id: string) => Promise<ActionResult>;
  dialogSize?: "sm" | "md" | "lg";
}) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrudRow | null>(null);
  const [target, setTarget] = useState<CrudRow | null>(null);
  const confirm = useConfirmState();

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(
    (formData: FormData) => save(editing?.id ?? null, formData),
    {
      successMessage: tc("toast.updated"),
      onSuccess: () => {
        setOpen(false);
        setEditing(null);
      },
    },
  );

  function openForm(row: CrudRow | null) {
    setEditing(row);
    setOpen(true);
  }

  const value = (name: string) => {
    const raw = editing?.[name];
    if (raw === null || raw === undefined) return "";
    if (raw instanceof Date) {
      return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`;
    }
    return String(raw);
  };

  const colSpan = columns.length + (canManage ? 1 : 0);

  return (
    <>
      {canManage ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus />
            {newLabel}
          </Button>
        </div>
      ) : null}

      <TableWrap>
        <Table>
          <THead>
            <TR>
              {columns.map((col) => (
                <TH key={col.key} className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : undefined}>
                  {col.header}
                </TH>
              ))}
              {canManage ? <TH className="w-10" /> : null}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={colSpan} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  {columns.map((col) => (
                    <TD
                      key={col.key}
                      className={col.align === "right" ? "text-right tabular" : col.align === "center" ? "text-center" : undefined}
                    >
                      {col.render ? col.render(row) : ((row[col.key] as ReactNode) ?? "-")}
                    </TD>
                  ))}
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
                          {remove ? (
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
                          ) : null}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? `${tc("actions.edit")}: ${editing.label}` : newLabel} size={dialogSize}>
          {/* Remount on target change so defaultValue picks up the new row. */}
          <form action={onSubmit} key={editing?.id ?? "new"}>
            <DialogBody className="space-y-4">
              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {formError}
                </p>
              ) : null}

              <FieldGroup>
                {fields.map((field) => {
                  const id = `crud-${field.name}`;
                  const error = fieldErrors[field.name];

                  if (field.kind === "checkbox") {
                    const checked = editing ? Boolean(editing[field.name]) : (field.defaultChecked ?? true);
                    return (
                      <div key={field.name} className="flex items-center sm:col-span-2">
                        <CheckboxRow
                          name={field.name}
                          value="on"
                          defaultChecked={checked}
                          label={field.label}
                          hint={field.hint}
                        />
                      </div>
                    );
                  }

                  const control =
                    field.kind === "textarea" ? (
                      <Textarea id={id} name={field.name} rows={field.rows ?? 3} defaultValue={value(field.name)} />
                    ) : field.kind === "select" ? (
                      <NativeSelect
                        id={id}
                        name={field.name}
                        required={field.required}
                        defaultValue={value(field.name)}
                      >
                        {field.allowEmpty !== false ? <option value="">{tc("labels.notSet")}</option> : null}
                        {field.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <Input
                        id={id}
                        name={field.name}
                        type={field.kind === "date" ? "date" : field.kind === "color" ? "color" : "text"}
                        inputMode={field.kind === "number" ? "decimal" : undefined}
                        step={field.kind === "number" ? field.step : undefined}
                        required={"required" in field ? field.required : undefined}
                        placeholder={field.kind === "text" ? field.placeholder : undefined}
                        defaultValue={value(field.name)}
                        className={
                          field.kind === "text" && field.mono
                            ? "font-mono"
                            : field.kind === "number"
                              ? "tabular"
                              : field.kind === "color"
                                ? "h-9 w-20 p-1"
                                : undefined
                        }
                      />
                    );

                  return (
                    <Field
                      key={field.name}
                      label={field.label}
                      htmlFor={id}
                      required={"required" in field ? field.required : undefined}
                      hint={"hint" in field ? field.hint : undefined}
                      error={error}
                      className={field.kind === "textarea" ? "sm:col-span-2" : undefined}
                    >
                      {control}
                    </Field>
                  );
                })}
              </FieldGroup>
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

      {remove ? (
        <ConfirmDialog
          open={confirm.open}
          onOpenChange={confirm.setOpen}
          title={tc("confirmDelete.title")}
          description={tc("confirmDelete.description", { name: target?.label ?? "" })}
          confirmLabel={tc("confirmDelete.confirm")}
          successMessage={tc("toast.deleted")}
          action={() => remove(target!.id)}
        />
      ) : null}

      <span className="sr-only">{title}</span>
    </>
  );
}
