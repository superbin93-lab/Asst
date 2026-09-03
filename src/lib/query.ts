export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZES = [10, 25, 50, 100] as const;

export type SearchParamsInput = Record<string, string | string[] | undefined>;

export function param(sp: SearchParamsInput, key: string): string | undefined {
  const value = sp[key];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function paramList(sp: SearchParamsInput, key: string): string[] {
  const value = sp[key];
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export function boolParam(sp: SearchParamsInput, key: string): boolean {
  return param(sp, key) === "1";
}

export function intParam(sp: SearchParamsInput, key: string, fallback: number): number {
  const raw = param(sp, key);
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type Pagination = { page: number; perPage: number; skip: number; take: number };

export function pagination(sp: SearchParamsInput): Pagination {
  const page = intParam(sp, "page", 1);
  const requested = intParam(sp, "perPage", DEFAULT_PAGE_SIZE);
  const perPage = (PAGE_SIZES as readonly number[]).includes(requested) ? requested : DEFAULT_PAGE_SIZE;
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

/**
 * Turns `?sort=name:desc` into a Prisma orderBy, restricted to an allow-list so
 * a crafted URL cannot order by an arbitrary column.
 */
export function sorting<T extends string>(
  sp: SearchParamsInput,
  allowed: readonly T[],
  fallback: { field: T; direction: "asc" | "desc" },
): { field: T; direction: "asc" | "desc" } {
  const raw = param(sp, "sort");
  if (!raw) return fallback;
  const [field, direction] = raw.split(":");
  if (!allowed.includes(field as T)) return fallback;
  return { field: field as T, direction: direction === "desc" ? "desc" : "asc" };
}

/** Prisma `contains` filter that is case-insensitive on PostgreSQL. */
export function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export function buildQueryString(current: SearchParamsInput, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value.join(",") : value;
    if (v) params.set(key, v);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  // Any change to filters resets to the first page.
  if (!("page" in patch)) params.delete("page");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
