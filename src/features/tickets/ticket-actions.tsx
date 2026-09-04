"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, RotateCcw, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { SubmitButton, useActionForm, useActionRunner } from "@/components/shared/form";
import { assignTicket, claimTicket, reopenTicket, resolveTicket } from "./actions";
import { CLOSED_STATUSES } from "./schema";

export function TicketActions({
  ticketId,
  status,
  assigneeId,
  currentUserId,
  agents,
  canAssign,
  canUpdate,
}: {
  ticketId: string;
  status: string;
  assigneeId: string | null;
  currentUserId: string;
  agents: { id: string; name: string }[];
  canAssign: boolean;
  canUpdate: boolean;
}) {
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const { run, pending } = useActionRunner();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState(assigneeId ?? "");

  const resolveForm = useActionForm(resolveTicket, {
    successMessage: tc("toast.updated"),
    onSuccess: () => setResolveOpen(false),
  });

  const finished = CLOSED_STATUSES.includes(status);

  if (!canUpdate) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!finished && assigneeId !== currentUserId ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => run(() => claimTicket(ticketId), { successMessage: tc("toast.updated") })}
        >
          <UserCheck />
          {t("actions.assignToMe")}
        </Button>
      ) : null}

      {canAssign && !finished ? (
        <Button variant="secondary" size="sm" onClick={() => setAssignOpen(true)}>
          <Users />
          {t("actions.reassign")}
        </Button>
      ) : null}

      {!finished ? (
        <Button
          size="sm"
          onClick={() => {
            resolveForm.reset();
            setResolveOpen(true);
          }}
        >
          <CheckCircle2 />
          {t("actions.resolve")}
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => run(() => reopenTicket(ticketId), { successMessage: tc("toast.updated") })}
        >
          <RotateCcw />
          {t("actions.reopen")}
        </Button>
      )}

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent title={t("actions.resolve")}>
          <form action={resolveForm.onSubmit}>
            <input type="hidden" name="ticketId" value={ticketId} />
            <DialogBody className="space-y-4">
              {resolveForm.formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
                  {resolveForm.formError}
                </p>
              ) : null}
              <Field
                label={t("fields.resolution")}
                htmlFor="resolution"
                required
                error={resolveForm.fieldErrors.resolution}
              >
                <Textarea id="resolution" name="resolution" rows={5} required />
              </Field>
              <CheckboxRow name="close" value="on" label={t("actions.closeTicket")} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setResolveOpen(false)}>
                {tc("actions.cancel")}
              </Button>
              <SubmitButton pending={resolveForm.pending}>{tc("actions.confirm")}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent title={t("actions.reassign")} size="sm">
          <DialogBody>
            <Field label={t("fields.assignee")} htmlFor="reassign-select">
              <NativeSelect
                id="reassign-select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">{t("filters.unassigned")}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setAssignOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => assignTicket(ticketId, selected || null), {
                  successMessage: tc("toast.updated"),
                  onSuccess: () => setAssignOpen(false),
                })
              }
            >
              {tc("actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
