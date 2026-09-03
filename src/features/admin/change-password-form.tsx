"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { changeOwnPassword } from "./actions";

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const formRef = useRef<HTMLFormElement>(null);

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(changeOwnPassword, {
    successMessage: t("passwordChanged"),
    onSuccess: () => formRef.current?.reset(),
  });

  return (
    <form ref={formRef} action={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}

      <Field
        label={t("currentPassword")}
        htmlFor="currentPassword"
        required
        error={fieldErrors.currentPassword}
      >
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>

      <Field
        label={t("newPassword")}
        htmlFor="newPassword"
        required
        error={fieldErrors.newPassword}
        hint={`${t("passwordRules.minLength")} · ${t("passwordRules.uppercase")} · ${t("passwordRules.lowercase")} · ${t("passwordRules.digit")}`}
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>

      <Field
        label={t("confirmPassword")}
        htmlFor="confirmPassword"
        required
        error={fieldErrors.confirmPassword}
      >
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pending={pending}>{t("changePassword")}</SubmitButton>
      </div>
    </form>
  );
}
