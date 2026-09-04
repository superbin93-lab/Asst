"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { PERMISSION_GROUPS } from "@/lib/auth/permissions";
import { deleteRole, saveRole } from "./actions";

export type RoleRow = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
};

export function RolePanel({ rows, canManage }: { rows: RoleRow[]; canManage: boolean }) {
  const t = useTranslations("admin.roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [target, setTarget] = useState<RoleRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const confirm = useConfirmState();

  const { onSubmit, pending, fieldErrors, formError, reset } = useActionForm(
    (formData: FormData) => saveRole(editing?.id ?? null, formData),
    {
      successMessage: tc("toast.updated"),
      onSuccess: () => {
        setOpen(false);
        setEditing(null);
      },
    },
  );

  function openForm(row: RoleRow | null) {
    reset();
    setEditing(row);
    setSelected(row?.permissions ?? []);
    setOpen(true);
  }

  const toggle = (permission: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, permission] : prev.filter((p) => p !== permission)));

  const toggleGroup = (permissions: string[], checked: boolean) =>
    setSelected((prev) =>
      checked
        ? Array.from(new Set([...prev, ...permissions]))
        : prev.filter((p) => !permissions.includes(p)),
    );

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
              <TH>{tc("labels.description")}</TH>
              <TH className="text-right">{t("userCount")}</TH>
              <TH className="text-right">{t("permissionCount")}</TH>
              {canManage ? <TH className="w-10" /> : null}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={canManage ? 6 : 5} title={tc("table.empty")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.code}</TD>
                  <TD>
                    <span className="flex items-center gap-2 font-medium">
                      {locale === "en" && row.nameEn ? row.nameEn : row.name}
                      {row.isSystem ? <Badge tone="info">{t("systemRole")}</Badge> : null}
                    </span>
                  </TD>
                  <TD className="max-w-md text-xs text-muted-foreground">{row.description ?? "-"}</TD>
                  <TD className="text-right tabular">{row.userCount}</TD>
                  <TD className="text-right tabular">{row.permissions.length}</TD>
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
                          {!row.isSystem ? (
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
        <DialogContent title={editing ? t("edit") : t("new")} size="xl">
          <form action={onSubmit} key={editing?.id ?? "new"}>
            <input type="hidden" name="permissions" value={selected.join(",")} />
            <DialogBody className="space-y-5">
              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {formError}
                </p>
              ) : null}

              <FieldGroup>
                <Field label={tc("labels.code")} htmlFor="r-code" required error={fieldErrors.code}>
                  <Input
                    id="r-code"
                    name="code"
                    required
                    readOnly={editing?.isSystem}
                    defaultValue={editing?.code ?? ""}
                    className="font-mono uppercase"
                  />
                </Field>
                <Field label={tc("labels.name")} htmlFor="r-name" required error={fieldErrors.name}>
                  <Input id="r-name" name="name" required defaultValue={editing?.name ?? ""} />
                </Field>
                <Field label="Name (EN)" htmlFor="r-nameEn">
                  <Input id="r-nameEn" name="nameEn" defaultValue={editing?.nameEn ?? ""} />
                </Field>
                <Field label={tc("labels.description")} htmlFor="r-description" className="sm:col-span-2">
                  <Textarea id="r-description" name="description" rows={2} defaultValue={editing?.description ?? ""} />
                </Field>
              </FieldGroup>

              {editing?.isSystem ? (
                <p className="rounded-md bg-info-subtle px-3 py-2 text-xs text-info">{t("systemRoleHint")}</p>
              ) : null}

              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const allChecked = group.permissions.every((p) => selected.includes(p));
                  return (
                    <div key={group.key} className="rounded-lg border border-border p-3">
                      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border pb-2">
                        <p className="text-xs font-semibold">{t(`groups.${group.key}` as never)}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroup(group.permissions, !allChecked)}
                        >
                          {t("selectAll")}
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.permissions.map((permission) => (
                          <CheckboxRow
                            key={permission}
                            label={t(`permissions.${permission.replaceAll(".", "_")}` as never)}
                            checked={selected.includes(permission)}
                            onCheckedChange={(checked) => toggle(permission, checked === true)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
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
        action={() => deleteRole(target!.id)}
      />
    </>
  );
}
