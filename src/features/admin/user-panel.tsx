"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SubmitButton, useActionForm, useActionRunner } from "@/components/shared/form";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { formatDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { deleteUser, resetUserPassword, saveUser } from "./actions";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  locale: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: Date | null;
  employeeId: string | null;
  employeeName: string | null;
  roleIds: string[];
  roleNames: string[];
};

export function UserPanel({
  rows,
  roles,
  employees,
  canManage,
  isSuperAdmin,
  currentUserId,
  locale,
}: {
  rows: UserRow[];
  roles: { id: string; name: string }[];
  employees: { id: string; fullName: string; employeeCode: string }[];
  canManage: boolean;
  isSuperAdmin: boolean;
  currentUserId: string;
  locale: AppLocale;
}) {
  const t = useTranslations("admin.users");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const confirm = useConfirmState();
  const { run, pending: running } = useActionRunner();

  const { onSubmit, pending, fieldErrors, formError, reset } = useActionForm(
    (formData: FormData) => saveUser(editing?.id ?? null, formData),
    {
      successMessage: tc("toast.updated"),
      onSuccess: () => {
        setOpen(false);
        setEditing(null);
      },
    },
  );

  function openForm(row: UserRow | null) {
    reset();
    setEditing(row);
    setSelectedRoles(row?.roleIds ?? []);
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
              <TH>{t("fields.name")}</TH>
              <TH>{t("fields.roles")}</TH>
              <TH>{t("fields.employee")}</TH>
              <TH>{t("fields.lastLoginAt")}</TH>
              <TH>{tc("labels.status")}</TH>
              {canManage ? <TH className="w-10" /> : null}
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={canManage ? 6 : 5} title={tc("table.empty")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <span className="flex items-center gap-2">
                      <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block font-medium">{row.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{row.email}</span>
                      </span>
                    </span>
                  </TD>
                  <TD>
                    <span className="flex flex-wrap gap-1">
                      {row.isSuperAdmin ? <Badge tone="danger">{t("fields.isSuperAdmin")}</Badge> : null}
                      {row.roleNames.map((name) => (
                        <Badge key={name} tone="neutral">
                          {name}
                        </Badge>
                      ))}
                    </span>
                  </TD>
                  <TD className="text-muted-foreground">{row.employeeName ?? "-"}</TD>
                  <TD className="text-xs text-muted-foreground tabular">
                    {formatDateTime(row.lastLoginAt, locale)}
                  </TD>
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
                            disabled={running}
                            onSelect={() =>
                              setTimeout(
                                () =>
                                  run(() => resetUserPassword(row.id), {
                                    successMessage: t("resetPassword"),
                                    onSuccess: (data) => setNewPassword(data.password),
                                  }),
                                0,
                              )
                            }
                          >
                            <KeyRound />
                            {t("resetPassword")}
                          </DropdownItem>
                          {row.id !== currentUserId ? (
                            <>
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
                            </>
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
        <DialogContent title={editing ? t("edit") : t("new")} size="lg">
          <form action={onSubmit} key={editing?.id ?? "new"}>
            <input type="hidden" name="roleIds" value={selectedRoles.join(",")} />
            <DialogBody className="space-y-4">
              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {formError}
                </p>
              ) : null}

              <FieldGroup>
                <Field label={t("fields.name")} htmlFor="u-name" required error={fieldErrors.name}>
                  <Input
                    id="u-name"
                    name="name"
                    required
                    placeholder={t("placeholders.name")}
                    defaultValue={editing?.name ?? ""}
                  />
                </Field>
                <Field label={t("fields.email")} htmlFor="u-email" required error={fieldErrors.email}>
                  <Input
                    id="u-email"
                    name="email"
                    type="email"
                    required
                    placeholder={t("placeholders.email")}
                    defaultValue={editing?.email ?? ""}
                  />
                </Field>
                <Field
                  label={t("fields.password")}
                  htmlFor="u-password"
                  required={!editing}
                  hint={editing ? t("resetPasswordHint") : t("passwordRule")}
                  error={fieldErrors.password}
                >
                  <Input
                    id="u-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t("placeholders.password")}
                  />
                </Field>
                <Field label={t("fields.employee")} htmlFor="u-employee" error={fieldErrors.employeeId}>
                  <NativeSelect id="u-employee" name="employeeId" defaultValue={editing?.employeeId ?? ""}>
                    <option value="">{tc("labels.notSet")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} - {e.fullName}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("fields.locale")} htmlFor="u-locale">
                  <NativeSelect id="u-locale" name="locale" defaultValue={editing?.locale ?? "vi"}>
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </NativeSelect>
                </Field>
              </FieldGroup>

              <div>
                <p className="mb-2 text-xs font-medium">{t("fields.roles")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roles.map((role) => (
                    <CheckboxRow
                      key={role.id}
                      label={role.name}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={(checked) =>
                        setSelectedRoles((prev) =>
                          checked ? [...prev, role.id] : prev.filter((id) => id !== role.id),
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <CheckboxRow
                  name="isActive"
                  value="on"
                  defaultChecked={editing?.isActive ?? true}
                  label={t("fields.isActive")}
                />
                {isSuperAdmin ? (
                  <CheckboxRow
                    name="isSuperAdmin"
                    value="on"
                    defaultChecked={editing?.isSuperAdmin ?? false}
                    label={t("fields.isSuperAdmin")}
                    hint={t("superAdminHint")}
                  />
                ) : null}
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

      <Dialog open={newPassword !== null} onOpenChange={(o) => !o && setNewPassword(null)}>
        <DialogContent title={t("resetPassword")} description={t("resetPasswordHint")} size="sm">
          <DialogBody>
            <code className="block select-all rounded-md bg-surface-muted px-3 py-2 text-center font-mono text-sm">
              {newPassword}
            </code>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setNewPassword(null)}>{tc("actions.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title={tc("confirmDelete.title")}
        description={tc("confirmDelete.description", { name: target?.email ?? "" })}
        confirmLabel={tc("confirmDelete.confirm")}
        successMessage={tc("toast.deleted")}
        action={() => deleteUser(target!.id)}
      />
    </>
  );
}
