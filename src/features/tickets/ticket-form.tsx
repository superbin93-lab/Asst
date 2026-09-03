"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action";
import { TICKET_PRIORITIES, TICKET_SOURCES } from "./schema";

export type TicketFormOptions = {
  categories: { id: string; name: string; nameEn: string | null }[];
  employees: { id: string; fullName: string; employeeCode: string }[];
  agents: { id: string; name: string }[];
  assets: { id: string; assetTag: string; name: string }[];
  locations: { id: string; name: string; code: string }[];
};

export function TicketForm({
  action,
  options,
  canAssign,
  canPickRequester,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>;
  options: TicketFormOptions;
  canAssign: boolean;
  canPickRequester: boolean;
  submitLabel: string;
}) {
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(action, {
    redirectTo: (data) => `/tickets/${data.id}`,
    successMessage: tc("toast.created"),
  });

  const categoryLabel = (c: { name: string; nameEn: string | null }) =>
    locale === "en" && c.nameEn ? c.nameEn : c.name;

  return (
    <form action={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-4 py-5">
          <Field label={t("fields.title")} htmlFor="title" required error={fieldErrors.title}>
            <Input id="title" name="title" required maxLength={200} autoFocus />
          </Field>

          <Field label={t("fields.description")} htmlFor="description" required error={fieldErrors.description}>
            <Textarea id="description" name="description" rows={6} required />
          </Field>

          <FieldGroup>
            <Field label={t("fields.category")} htmlFor="categoryId">
              <NativeSelect id="categoryId" name="categoryId" defaultValue="">
                <option value="">{tc("labels.selectPlaceholder")}</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label={t("fields.priority")} htmlFor="priority">
              <NativeSelect id="priority" name="priority" defaultValue="MEDIUM">
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t(`priority.${p}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {canPickRequester ? (
              <Field label={t("fields.requester")} htmlFor="requesterId">
                <NativeSelect id="requesterId" name="requesterId" defaultValue="">
                  <option value="">{tc("labels.selectPlaceholder")}</option>
                  {options.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.fullName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            {canAssign ? (
              <Field label={t("fields.assignee")} htmlFor="assigneeId">
                <NativeSelect id="assigneeId" name="assigneeId" defaultValue="">
                  <option value="">{t("filters.unassigned")}</option>
                  {options.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            <Field label={t("fields.asset")} htmlFor="assetId">
              <NativeSelect id="assetId" name="assetId" defaultValue="">
                <option value="">{tc("labels.notSet")}</option>
                {options.assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} - {a.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label={t("fields.location")} htmlFor="locationId">
              <NativeSelect id="locationId" name="locationId" defaultValue="">
                <option value="">{tc("labels.notSet")}</option>
                {options.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {canPickRequester ? (
              <Field label={t("fields.source")} htmlFor="source">
                <NativeSelect id="source" name="source" defaultValue="WEB">
                  {TICKET_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {t(`source.${s}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          {tc("actions.cancel")}
        </Button>
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
