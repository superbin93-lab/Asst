import type { AppLocale } from "@/i18n/config";

const LOCALE_TAG: Record<AppLocale, string> = { vi: "vi-VN", en: "en-GB" };

export function formatMoney(
  value: number | string | null | undefined,
  currency = "VND",
  locale: AppLocale = "vi",
): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(n);
}

export function formatNumber(value: number, locale: AppLocale = "vi", fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(value: Date | string | null | undefined, locale: AppLocale = "vi"): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

export function formatDateTime(value: Date | string | null | undefined, locale: AppLocale = "vi"): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

/** "2 ngày 3 giờ" / "2d 3h" for SLA countdowns. */
export function formatDuration(minutes: number, locale: AppLocale = "vi"): string {
  const abs = Math.abs(Math.round(minutes));
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  const units = locale === "vi"
    ? { d: "ngày", h: "giờ", m: "phút" }
    : { d: "d", h: "h", m: "m" };
  const parts: string[] = [];
  if (d) parts.push(`${d} ${units.d}`);
  if (h) parts.push(`${h} ${units.h}`);
  if (!d && m) parts.push(`${m} ${units.m}`);
  return parts.join(" ") || `0 ${units.m}`;
}

/** Date input value (yyyy-mm-dd) without timezone drift. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
