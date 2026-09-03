import type { AppLocale } from "@/i18n/config";

/**
 * Messages are split one file per namespace so modules stay independent.
 * `npm run i18n:check` fails the build if the two locales drift apart.
 */
const NAMESPACES = [
  "app", "common", "nav", "auth", "forbidden", "notFound", "validation",
  "dashboard", "assets", "catalog", "tickets", "hr", "leave", "reports", "admin",
] as const;

export async function loadMessages(locale: AppLocale) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`./${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, unknown>;
}

export { NAMESPACES };
