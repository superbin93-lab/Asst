"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { toDateInputValue } from "@/lib/format";
import { ASSET_CONDITIONS } from "./schema";
import { assignAsset } from "./actions";

type Employee = { id: string; fullName: string; employeeCode: string };
type Location = { id: string; name: string; code: string };

export function AssignAssetDialog({
  assetId,
  assetLabel,
  employees,
  locations,
  disabled,
}: {
  assetId: string;
  assetLabel: string;
  employees: Employee[];
  locations: Location[];
  disabled?: boolean;
}) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  // The list page links here with ?action=assign to open the dialog directly, so
  // the open state is derived from the URL until the user overrides it.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? (searchParams.get("action") === "assign" && !disabled);
  const setOpen = setOverride;

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(assignAsset, {
    successMessage: tc("toast.updated"),
    onSuccess: () => {
      setOpen(false);
      router.replace(`/assets/${assetId}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <UserPlus />
        {t("assignment.assignTitle")}
      </Button>

      <DialogContent title={t("assignment.assignTitle")} description={assetLabel}>
        <form action={onSubmit}>
          <input type="hidden" name="assetId" value={assetId} />
          <DialogBody className="space-y-4">
            {formError ? (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                {formError}
              </p>
            ) : null}

            <Field
              label={t("assignment.employee")}
              htmlFor="employeeId"
              required
              error={fieldErrors.employeeId}
            >
              <NativeSelect id="employeeId" name="employeeId" required defaultValue="">
                <option value="">{tc("labels.selectPlaceholder")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode} - {e.fullName}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <FieldGroup>
              <Field label={t("assignment.assignedAt")} htmlFor="assignedAt">
                <Input
                  id="assignedAt"
                  name="assignedAt"
                  type="date"
                  defaultValue={toDateInputValue(new Date())}
                />
              </Field>
              <Field label={t("assignment.expectedReturnAt")} htmlFor="expectedReturnAt">
                <Input id="expectedReturnAt" name="expectedReturnAt" type="date" />
              </Field>
              <Field label={t("assignment.conditionOut")} htmlFor="conditionOut">
                <NativeSelect id="conditionOut" name="conditionOut" defaultValue="GOOD">
                  {ASSET_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {t(`condition.${c}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.location")} htmlFor="assign-locationId">
                <NativeSelect id="assign-locationId" name="locationId" defaultValue="">
                  <option value="">{tc("labels.notSet")}</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>

            <Field label={tc("labels.note")} htmlFor="assign-note">
              <Textarea id="assign-note" name="note" rows={2} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <SubmitButton pending={pending}>{tc("actions.assign")}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
