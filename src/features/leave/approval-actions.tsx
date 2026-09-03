"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton, useActionForm, useActionRunner } from "@/components/shared/form";
import { cancelLeaveRequest, decideLeaveRequest, submitLeaveRequest } from "./actions";

export function LeaveRequestActions({
  requestId,
  employeeName,
  status,
  canDecide,
  canCancel,
  canSubmit,
}: {
  requestId: string;
  employeeName: string;
  status: string;
  canDecide: boolean;
  canCancel: boolean;
  canSubmit: boolean;
}) {
  const t = useTranslations("leave");
  const tc = useTranslations("common");
  const { run, pending } = useActionRunner();
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const decideForm = useActionForm(decideLeaveRequest, {
    successMessage: decision === "REJECTED" ? t("approval.rejected") : t("approval.approved"),
    onSuccess: () => setDecision(null),
  });

  const cancelForm = useActionForm(cancelLeaveRequest, {
    successMessage: t("toast.cancelled"),
    onSuccess: () => setCancelOpen(false),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSubmit && status === "DRAFT" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => submitLeaveRequest(requestId), { successMessage: t("toast.submitted") })}
        >
          <Send />
          {tc("actions.submit")}
        </Button>
      ) : null}

      {canDecide && status === "PENDING" ? (
        <>
          <Button size="sm" onClick={() => setDecision("APPROVED")}>
            <Check />
            {tc("actions.approve")}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDecision("REJECTED")}>
            <X />
            {tc("actions.reject")}
          </Button>
        </>
      ) : null}

      {canCancel && (status === "PENDING" || status === "APPROVED" || status === "DRAFT") ? (
        <Button size="sm" variant="secondary" onClick={() => setCancelOpen(true)}>
          {tc("actions.cancel")}
        </Button>
      ) : null}

      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent
          title={decision === "REJECTED" ? tc("actions.reject") : tc("actions.approve")}
          description={
            decision === "REJECTED"
              ? t("approval.rejectConfirm", { name: employeeName })
              : t("approval.approveConfirm", { name: employeeName })
          }
          size="sm"
        >
          <form action={decideForm.onSubmit}>
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="decision" value={decision ?? "APPROVED"} />
            <DialogBody className="space-y-3">
              {decideForm.formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {decideForm.formError}
                </p>
              ) : null}
              <Field
                label={t("approval.comment")}
                htmlFor="comment"
                required={decision === "REJECTED"}
                error={decideForm.fieldErrors.comment}
              >
                <Textarea
                  id="comment"
                  name="comment"
                  rows={3}
                  placeholder={t("approval.commentPlaceholder")}
                  required={decision === "REJECTED"}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDecision(null)}>
                {tc("actions.cancel")}
              </Button>
              <SubmitButton
                pending={decideForm.pending}
                variant={decision === "REJECTED" ? "danger" : "primary"}
              >
                {tc("actions.confirm")}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent title={tc("actions.cancel")} size="sm">
          <form action={cancelForm.onSubmit}>
            <input type="hidden" name="requestId" value={requestId} />
            <DialogBody>
              <Field label={tc("labels.reason")} htmlFor="cancelReason">
                <Textarea id="cancelReason" name="cancelReason" rows={3} />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
                {tc("actions.close")}
              </Button>
              <SubmitButton pending={cancelForm.pending} variant="danger">
                {tc("actions.confirm")}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
