"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action";

export function SubmitButton({
  children,
  pending,
  ...props
}: ButtonProps & { pending?: boolean }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

type UseActionFormOptions<T> = {
  onSuccess?: (data: T) => void;
  successMessage?: string;
  redirectTo?: string | ((data: T) => string);
  /** Refresh server components after a successful mutation. */
  refresh?: boolean;
};

/**
 * Drives a form backed by a server action returning `ActionResult`.
 * Field errors come back as message keys and are translated here, so an action
 * never has to know which language the caller is using.
 */
export function useActionForm<T>(
  action: (formData: FormData) => Promise<ActionResult<T>>,
  options: UseActionFormOptions<T> = {},
) {
  const t = useTranslations("common.toast");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Field errors and action error codes both arrive as `validation` keys. A
   * missing key makes next-intl *return the key path* rather than throw, so the
   * old try/catch never fired and strings like "validation.minLength" reached
   * the user. Check first, and fall back to the generic message.
   */
  const translateError = useCallback(
    (key: string) => (tv.has(key as never) ? tv(key as never) : t("error")),
    [t, tv],
  );

  /** Clears stale errors, so reopening a dialog starts on a clean form. */
  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const onSubmit = useCallback(
    (formData: FormData) => {
      setFieldErrors({});
      setFormError(null);
      startTransition(async () => {
        const result = await action(formData);
        if (result.ok) {
          toast.success(options.successMessage ?? t("updated"));
          options.onSuccess?.(result.data);
          if (options.redirectTo) {
            const href =
              typeof options.redirectTo === "function" ? options.redirectTo(result.data) : options.redirectTo;
            router.push(href);
          }
          if (options.refresh !== false) router.refresh();
          return;
        }

        if (result.fieldErrors) {
          setFieldErrors(
            Object.fromEntries(
              Object.entries(result.fieldErrors).map(([field, key]) => [field, translateError(key)]),
            ),
          );
        }
        const message = result.error === "forbidden" ? t("forbidden") : translateError(result.error);
        setFormError(message);
        toast.error(message);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, options.successMessage, options.redirectTo, options.refresh, router, t, translateError],
  );

  return { onSubmit, pending, fieldErrors, formError, setFieldErrors, reset };
}

/** Fire-and-forget action runner for row menus and confirm dialogs. */
export function useActionRunner() {
  const t = useTranslations("common.toast");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, opts: { successMessage?: string; onSuccess?: (d: T) => void } = {}) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(opts.successMessage ?? t("updated"));
          opts.onSuccess?.(result.data);
          router.refresh();
        } else {
          toast.error(result.error === "forbidden" ? t("forbidden") : t("error"));
        }
      });
    },
    [router, t],
  );

  return { run, pending };
}
