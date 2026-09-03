"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useActionRunner } from "./form";
import type { ActionResult } from "@/lib/action";

/**
 * Confirmation for destructive actions. Controlled from the caller so it can be
 * opened from a dropdown item without the menu stealing focus.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  action,
  successMessage,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<ActionResult<unknown>>;
  successMessage?: string;
  onDone?: () => void;
}) {
  const tc = useTranslations("common.actions");
  const { run, pending } = useActionRunner();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} size="sm">
        <DialogBody>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            {tc("cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              run(action, {
                successMessage,
                onSuccess: () => {
                  onOpenChange(false);
                  onDone?.();
                },
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small helper for the common "are you sure you want to delete X" case. */
export function useConfirmState() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, openDialog: () => setOpen(true) };
}
