"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { login, type LoginState } from "./actions";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  const errorMessage =
    state.error === "invalidCredentials"
      ? t("invalidCredentials")
      : state.error === "accountDisabled"
        ? t("accountDisabled")
        : state.error === "invalidInput"
          ? tv("required")
          : null;

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      {errorMessage ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {errorMessage}
        </p>
      ) : null}

      <Field label={t("email")} htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="ten.ban@company.local"
          aria-invalid={state.error === "invalidCredentials" || undefined}
        />
      </Field>

      <Field label={t("password")} htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error === "invalidCredentials" || undefined}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {pending ? t("signingIn") : t("submit")}
      </Button>
    </form>
  );
}
