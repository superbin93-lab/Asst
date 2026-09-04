"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { adjustBalance, generateBalances } from "./balance-actions";

export function GenerateBalancesButton({ year }: { year: number }) {
  const t = useTranslations("leave.balance");
  const { onSubmit, pending } = useActionForm(generateBalances, {
    successMessage: t("recalculate"),
  });

  return (
    <form action={onSubmit}>
      <input type="hidden" name="year" value={year} />
      <SubmitButton pending={pending} size="sm" variant="secondary">
        <RefreshCw />
        {t("generateForYear", { year })}
      </SubmitButton>
    </form>
  );
}

export function AdjustBalanceButton({
  balanceId,
  employeeName,
  typeName,
  adjustmentDays,
  note,
}: {
  balanceId: string;
  employeeName: string;
  typeName: string;
  adjustmentDays: number;
  note: string | null;
}) {
  const t = useTranslations("leave.balance");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const { onSubmit, pending, fieldErrors, formError, reset } = useActionForm(adjustBalance, {
    successMessage: tc("toast.updated"),
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={t("adjustTitle")}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <SlidersHorizontal className="text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("adjustTitle")} description={`${employeeName} · ${typeName}`} size="sm">
          <form action={onSubmit}>
            <input type="hidden" name="balanceId" value={balanceId} />
            <DialogBody className="space-y-3">
              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {formError}
                </p>
              ) : null}
              <Field
                label={t("adjustment")}
                htmlFor="adjustmentDays"
                hint={t("adjustHint")}
                error={fieldErrors.adjustmentDays}
              >
                <Input
                  id="adjustmentDays"
                  name="adjustmentDays"
                  type="number"
                  step="0.5"
                  defaultValue={adjustmentDays}
                  className="tabular"
                />
              </Field>
              <Field label={tc("labels.note")} htmlFor="balance-note">
                <Textarea id="balance-note" name="note" rows={2} defaultValue={note ?? ""} />
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
    </>
  );
}
