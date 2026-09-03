"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Lock, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { formatDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { addComment } from "./actions";

export type TicketComment = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  authorName: string;
  authorAvatar: string | null;
  isMine: boolean;
};

export function TicketConversation({
  ticketId,
  comments,
  canPostInternal,
  locale,
}: {
  ticketId: string;
  comments: TicketComment[];
  canPostInternal: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("tickets.comments");
  const tc = useTranslations("common");
  const formRef = useRef<HTMLFormElement>(null);

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(addComment, {
    successMessage: tc("toast.created"),
    onSuccess: () => formRef.current?.reset(),
  });

  return (
    <div className="space-y-5">
      {comments.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar name={comment.authorName} src={comment.authorAvatar} size="sm" className="mt-0.5" />
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-lg border px-3 py-2",
                  comment.isInternal
                    ? "border-warning/40 bg-warning-subtle/50"
                    : "border-border bg-surface-muted/50",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-xs font-medium">{comment.authorName}</span>
                  <span className="text-[11px] text-muted-foreground tabular">
                    {formatDateTime(comment.createdAt, locale)}
                  </span>
                </div>
                {comment.isInternal ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                    <Lock className="size-3" />
                    {t("internalNote")}
                  </span>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form ref={formRef} action={onSubmit} className="space-y-3 border-t border-border pt-4">
        <input type="hidden" name="ticketId" value={ticketId} />

        {formError ? (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        ) : null}

        <Textarea
          name="body"
          rows={4}
          placeholder={t("placeholder")}
          required
          aria-invalid={Boolean(fieldErrors.body) || undefined}
        />
        {fieldErrors.body ? <p className="text-xs text-danger">{fieldErrors.body}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {canPostInternal ? (
            <CheckboxRow name="isInternal" value="on" label={t("internalNote")} hint={t("internalHint")} />
          ) : (
            <span />
          )}
          <SubmitButton pending={pending} size="sm">
            <Send />
            {t("send")}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
