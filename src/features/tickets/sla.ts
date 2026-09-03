import { indexHolidays, isoWeekday, type HolidayEntry, type HolidayIndex } from "@/features/leave/workdays";

/** Working window used when an SLA policy is set to business hours only. */
export const BUSINESS_HOURS = {
  morningStart: 8 * 60,
  morningEnd: 12 * 60,
  afternoonStart: 13 * 60,
  afternoonEnd: 17 * 60 + 30,
} as const;

export const MINUTES_PER_BUSINESS_DAY =
  BUSINESS_HOURS.morningEnd - BUSINESS_HOURS.morningStart +
  (BUSINESS_HOURS.afternoonEnd - BUSINESS_HOURS.afternoonStart);

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

function atMinutes(day: Date, minutes: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function isWorkingDay(date: Date, workweek: number[], holidays: HolidayIndex): boolean {
  if (!workweek.includes(isoWeekday(date))) return false;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const md = key.slice(5);
  if (holidays.fixed.has(key)) return holidays.fixed.get(key) === true; // half-day holidays still count as working
  if (holidays.recurring.has(md)) return holidays.recurring.get(md) === true;
  return true;
}

/**
 * Adds business minutes to a timestamp, skipping nights, weekends and public
 * holidays. Used to turn an SLA target ("resolve within 240 minutes") into a
 * concrete due date the helpdesk can be measured against.
 */
export function addBusinessMinutes(
  start: Date,
  minutes: number,
  workweek: number[],
  holidays: HolidayIndex,
): Date {
  let cursor = new Date(start);
  let remaining = minutes;
  let guard = 0;

  while (remaining > 0 && guard++ < 3650) {
    if (!isWorkingDay(cursor, workweek, holidays)) {
      cursor = atMinutes(new Date(cursor.getTime() + 86_400_000), BUSINESS_HOURS.morningStart);
      continue;
    }

    const now = minutesOfDay(cursor);
    let windowStart: number;
    let windowEnd: number;

    if (now < BUSINESS_HOURS.morningStart) {
      windowStart = BUSINESS_HOURS.morningStart;
      windowEnd = BUSINESS_HOURS.morningEnd;
    } else if (now < BUSINESS_HOURS.morningEnd) {
      windowStart = now;
      windowEnd = BUSINESS_HOURS.morningEnd;
    } else if (now < BUSINESS_HOURS.afternoonStart) {
      windowStart = BUSINESS_HOURS.afternoonStart;
      windowEnd = BUSINESS_HOURS.afternoonEnd;
    } else if (now < BUSINESS_HOURS.afternoonEnd) {
      windowStart = now;
      windowEnd = BUSINESS_HOURS.afternoonEnd;
    } else {
      cursor = atMinutes(new Date(cursor.getTime() + 86_400_000), BUSINESS_HOURS.morningStart);
      continue;
    }

    const available = windowEnd - windowStart;
    if (remaining <= available) return atMinutes(cursor, windowStart + remaining);

    remaining -= available;
    cursor = atMinutes(cursor, windowEnd);
  }

  return cursor;
}

export function addCalendarMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

export type SlaTargets = { responseDueAt: Date; resolutionDueAt: Date };

export function computeSlaTargets(
  createdAt: Date,
  policy: { responseMinutes: number; resolutionMinutes: number; businessHoursOnly: boolean },
  workweek: number[],
  holidays: HolidayEntry[],
): SlaTargets {
  if (!policy.businessHoursOnly) {
    return {
      responseDueAt: addCalendarMinutes(createdAt, policy.responseMinutes),
      resolutionDueAt: addCalendarMinutes(createdAt, policy.resolutionMinutes),
    };
  }

  const index = indexHolidays(holidays);
  return {
    responseDueAt: addBusinessMinutes(createdAt, policy.responseMinutes, workweek, index),
    resolutionDueAt: addBusinessMinutes(createdAt, policy.resolutionMinutes, workweek, index),
  };
}

export type SlaState = "onTrack" | "dueSoon" | "breached" | "met" | "none";

/**
 * SLA badge state for a ticket row. `met` means the work finished before the
 * deadline, so the countdown is no longer relevant.
 */
export function slaState(
  dueAt: Date | null,
  completedAt: Date | null,
  now = new Date(),
): { state: SlaState; minutes: number } {
  if (!dueAt) return { state: "none", minutes: 0 };
  const reference = completedAt ?? now;
  const minutes = Math.round((dueAt.getTime() - reference.getTime()) / 60_000);

  if (completedAt) return { state: minutes >= 0 ? "met" : "breached", minutes };
  if (minutes < 0) return { state: "breached", minutes };
  if (minutes <= 60) return { state: "dueSoon", minutes };
  return { state: "onTrack", minutes };
}
