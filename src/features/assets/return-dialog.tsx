"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { toDateInputValue } from "@/lib/format";
import { ASSET_CONDITIONS } from "./schema";
import { returnAsset } from "./actions";

const NEXT_STATUSES = ["IN_STOCK", "IN_REPAIR", "RETIRED", "LOST"] as const;

export function ReturnAssetDialog({
  assignmentId,
  holderName,
  locations,
}: {
  assignmentId: string;
  holderName: string;
  locations: { id: string; name: string; code: string }[];
}) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(returnAsset, {
    successMessage: t("assignment.returnSuccess"),
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <PackageCheck />
        {t("assignment.returnTitle")}
      </Button>

      <DialogContent title={t("assignment.returnTitle")} description={holderName}>
        <form action={onSubmit}>
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <DialogBody className="space-y-4">
            {formError ? (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                {formError}
              </p>
            ) : null}

            <FieldGroup>
              <Field label={t("assignment.returnedAt")} htmlFor="returnedAt" error={fieldErrors.returnedAt}>
                <Input
                  id="returnedAt"
                  name="returnedAt"
                  type="date"
                  defaultValue={toDateInputValue(new Date())}
                />
              </Field>
              <Field label={t("assignment.conditionIn")} htmlFor="conditionIn">
                <NativeSelect id="conditionIn" name="conditionIn" defaultValue="GOOD">
                  {ASSET_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {t(`condition.${c}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.status")} htmlFor="nextStatus">
                <NativeSelect id="nextStatus" name="nextStatus" defaultValue="IN_STOCK">
                  {NEXT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.location")} htmlFor="return-locationId">
                <NativeSelect id="return-locationId" name="locationId" defaultValue="">
                  <option value="">{tc("labels.notSet")}</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>

            <Field label={tc("labels.note")} htmlFor="return-note">
              <Textarea id="return-note" name="note" rows={2} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <SubmitButton pending={pending}>{tc("actions.return")}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
