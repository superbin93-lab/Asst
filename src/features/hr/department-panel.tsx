"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { deleteDepartment, saveDepartment } from "./actions";

export type DepartmentRow = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  managerId: string | null;
  managerName: string | null;
  isActive: boolean;
  employeeCount: number;
  assetCount: number;
};

export function DepartmentPanel({
  rows,
  managers,
  canManage,
}: {
  rows: DepartmentRow[];
  managers: { id: string; fullName: string; employeeCode: string }[];
  canManage: boolean;
}) {
  const t = useTranslations("hr.departments");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [target, setTarget] = useState<DepartmentRow | null>(null);
  const confirm = useConfirmState();

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(
    (formData: FormData) => saveDepartment(editing?.id ?? null, formData),
    {
      successMessage: tc("toast.updated"),
      onSuccess: () => {
        setOpen(false);
        setEditing(null);
      },
    },
  );

  const label = (row: { name: string; nameEn: string | null }) =>
    locale === "en" && row.nameEn ? row.nameEn : row.name;

  function openForm(row: DepartmentRow | null) {
    setEditing(row);
    setOpen(true);
  }

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
              <TH>{tc("labels.code")}</TH>
              <TH>{tc("labels.name")}</TH>
              <TH>{t("parent")}</TH>
              <TH>{t("manager")}</TH>
              <TH className="text-right">{t("headcount")}</TH>
              <TH className="text-right">{t("assetCount")}</TH>
              <TH>{tc("labels.status")}</TH>
              {canManage ? <TH className="w-10" /> : null}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={canManage ? 8 : 7} title={tc("table.empty")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.code}</TD>
                  <TD className="font-medium">{label(row)}</TD>
                  <TD className="text-muted-foreground">{row.parentName ?? "-"}</TD>
                  <TD className="text-muted-foreground">{row.managerName ?? "-"}</TD>
                  <TD className="text-right tabular">{row.employeeCount}</TD>
                  <TD className="text-right tabular">{row.assetCount}</TD>
                  <TD>
                    <Badge tone={row.isActive ? "success" : "neutral"}>
                      {row.isActive ? tc("labels.yes") : tc("labels.no")}
                    </Badge>
                  </TD>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? tc("actions.edit") : t("new")}>
          <form action={onSubmit}>
            <DialogBody className="space-y-4">
              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {formError}
                </p>
              ) : null}

              <FieldGroup>
                <Field label={tc("labels.code")} htmlFor="d-code" required error={fieldErrors.code}>
                  <Input
                    id="d-code"
                    name="code"
                    required
                    defaultValue={editing?.code ?? ""}
                    className="font-mono uppercase"
                  />
                </Field>
                <Field label={tc("labels.name")} htmlFor="d-name" required error={fieldErrors.name}>
                  <Input id="d-name" name="name" required defaultValue={editing?.name ?? ""} />
                </Field>
                <Field label="Name (EN)" htmlFor="d-nameEn">
                  <Input id="d-nameEn" name="nameEn" defaultValue={editing?.nameEn ?? ""} />
                </Field>
                <Field label={t("parent")} htmlFor="d-parent" error={fieldErrors.parentId}>
                  <NativeSelect id="d-parent" name="parentId" defaultValue={editing?.parentId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {rows
                      .filter((r) => r.id !== editing?.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {label(r)}
                        </option>
                      ))}
                  </NativeSelect>
                </Field>
                <Field label={t("manager")} htmlFor="d-manager">
                  <NativeSelect id="d-manager" name="managerId" defaultValue={editing?.managerId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.employeeCode} - {m.fullName}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </FieldGroup>

              <Field label={tc("labels.description")} htmlFor="d-description">
                <Textarea id="d-description" name="description" rows={2} defaultValue={editing?.description ?? ""} />
              </Field>

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
              <SubmitButton pending={pending}>{tc("actions.save")}</SubmitButton>
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
        action={() => deleteDepartment(target!.id)}
      />
    </>
  );
}
