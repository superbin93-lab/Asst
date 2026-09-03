import type { LeaveDayPart } from "@/generated/prisma/enums";

export type HolidayEntry = {
  date: Date;
  isHalfDay: boolean;
  isRecurring: boolean;
};

/** ISO weekday: Monday = 1 ... Sunday = 7. */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

const monthDayKey = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dateKey = (d: Date) => `${d.getFullYear()}-${monthDayKey(d)}`;

/**
 * Pre-indexes holidays so a range scan is O(1) per day. Recurring entries match
 * on month/day in any year; fixed entries match the exact date.
 */
export function indexHolidays(holidays: HolidayEntry[]) {
  const fixed = new Map<string, boolean>(); // key -> isHalfDay
  const recurring = new Map<string, boolean>();
  for (const h of holidays) {
    const target = h.isRecurring ? recurring : fixed;
    const key = h.isRecurring ? monthDayKey(h.date) : dateKey(h.date);
    // A full-day holiday wins over a half-day one on the same date.
    target.set(key, (target.get(key) ?? true) && h.isHalfDay);
  }
  return { fixed, recurring };
}

export type HolidayIndex = ReturnType<typeof indexHolidays>;

/** Returns the fraction of the day that is worked: 1, 0.5 or 0. */
export function workingFraction(
  date: Date,
  workweek: number[],
  holidays: HolidayIndex,
): number {
  if (!workweek.includes(isoWeekday(date))) return 0;
  const fixed = holidays.fixed.get(dateKey(date));
  if (fixed !== undefined) return fixed ? 0.5 : 0;
  const recurring = holidays.recurring.get(monthDayKey(date));
  if (recurring !== undefined) return recurring ? 0.5 : 0;
  return 1;
}

export type LeaveSpan = {
  startDate: Date;
  endDate: Date;
  startDayPart: LeaveDayPart;
  endDayPart: LeaveDayPart;
};

export type LeaveDayBreakdown = {
  date: Date;
  fraction: number;
};

/**
 * Counts leave days across a span.
 *
 * Weekends and public holidays are excluded entirely; a half-day holiday
 * contributes 0.5. The first and last day contribute 0.5 when the request
 * covers only one half of them. A single-day request with any half-day part
 * counts as 0.5.
 */
export function calculateLeaveDays(
  span: LeaveSpan,
  workweek: number[],
  holidays: HolidayIndex,
): { totalDays: number; breakdown: LeaveDayBreakdown[] } {
  const breakdown: LeaveDayBreakdown[] = [];
  const start = new Date(span.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(span.endDate);
  end.setHours(0, 0, 0, 0);
  if (end < start) return { totalDays: 0, breakdown };

  const singleDay = start.getTime() === end.getTime();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    let fraction = workingFraction(date, workweek, holidays);
    if (fraction === 0) continue;

    if (singleDay) {
      if (span.startDayPart !== "FULL" || span.endDayPart !== "FULL") fraction = Math.min(fraction, 0.5);
    } else if (date.getTime() === start.getTime()) {
      if (span.startDayPart === "AFTERNOON") fraction = Math.min(fraction, 0.5);
    } else if (date.getTime() === end.getTime()) {
      if (span.endDayPart === "MORNING") fraction = Math.min(fraction, 0.5);
    }

    breakdown.push({ date, fraction });
  }

  const totalDays = breakdown.reduce((sum, day) => sum + day.fraction, 0);
  return { totalDays, breakdown };
}

/** Number of calendar days the request spans, used for max-consecutive checks. */
export function calendarSpanDays(startDate: Date, endDate: Date): number {
  const ms =
    Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) -
    Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  return Math.round(ms / 86_400_000) + 1;
}
