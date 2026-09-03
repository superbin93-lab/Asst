import { ForbiddenError } from "./auth/guard";

/**
 * Uniform result shape for every server action so forms can render errors the
 * same way. `fieldErrors` is keyed by form field and holds message *keys* from
 * the `validation` namespace, translated on the client.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

type ZodLikeError = { issues: readonly { readonly path: readonly PropertyKey[]; message: string }[] };

export function zodFieldErrors(error: ZodLikeError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** Wraps an action body, turning thrown errors into an ActionResult. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ForbiddenError) return fail("forbidden");
    // Re-throw framework control-flow errors (redirect, notFound) untouched.
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[action] unhandled error", error);
    return fail("unexpected");
  }
}

export function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formEntries(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, formValue(formData, k)]));
}
