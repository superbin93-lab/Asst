import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateLeaveDays,
  calendarSpanDays,
  indexHolidays,
  isoWeekday,
  workingFraction,
} from "../src/features/leave/workdays";

const MON_FRI = [1, 2, 3, 4, 5];
const d = (iso: string) => new Date(`${iso}T00:00:00`);
const noHolidays = indexHolidays([]);

describe("isoWeekday", () => {
  it("maps Sunday to 7 and Monday to 1", () => {
    assert.equal(isoWeekday(d("2026-03-01")), 7); // Sunday
    assert.equal(isoWeekday(d("2026-03-02")), 1); // Monday
    assert.equal(isoWeekday(d("2026-03-07")), 6); // Saturday
  });
});

describe("workingFraction", () => {
  it("returns 0 for days outside the workweek", () => {
    assert.equal(workingFraction(d("2026-03-07"), MON_FRI, noHolidays), 0);
    assert.equal(workingFraction(d("2026-03-08"), MON_FRI, noHolidays), 0);
  });

  it("returns 1 for a normal working day", () => {
    assert.equal(workingFraction(d("2026-03-04"), MON_FRI, noHolidays), 1);
  });

  it("excludes a fixed public holiday", () => {
    const holidays = indexHolidays([{ date: d("2026-03-04"), isHalfDay: false, isRecurring: false }]);
    assert.equal(workingFraction(d("2026-03-04"), MON_FRI, holidays), 0);
  });

  it("counts a half-day holiday as 0.5", () => {
    const holidays = indexHolidays([{ date: d("2026-03-04"), isHalfDay: true, isRecurring: false }]);
    assert.equal(workingFraction(d("2026-03-04"), MON_FRI, holidays), 0.5);
  });

  it("matches a recurring holiday in any year", () => {
    const holidays = indexHolidays([{ date: d("2020-09-02"), isHalfDay: false, isRecurring: true }]);
    assert.equal(workingFraction(d("2026-09-02"), MON_FRI, holidays), 0);
  });

  it("lets a full-day holiday win over a half-day one on the same date", () => {
    const holidays = indexHolidays([
      { date: d("2026-03-04"), isHalfDay: true, isRecurring: false },
      { date: d("2026-03-04"), isHalfDay: false, isRecurring: false },
    ]);
    assert.equal(workingFraction(d("2026-03-04"), MON_FRI, holidays), 0);
  });

  it("honours a six-day workweek", () => {
    assert.equal(workingFraction(d("2026-03-07"), [1, 2, 3, 4, 5, 6], noHolidays), 1);
  });
});

describe("calculateLeaveDays", () => {
  const span = (start: string, end: string, startPart = "FULL", endPart = "FULL") =>
    calculateLeaveDays(
      {
        startDate: d(start),
        endDate: d(end),
        startDayPart: startPart as "FULL",
        endDayPart: endPart as "FULL",
      },
      MON_FRI,
      noHolidays,
    ).totalDays;

  it("counts a single working day as 1", () => {
    assert.equal(span("2026-03-04", "2026-03-04"), 1);
  });

  it("counts a single half day as 0.5", () => {
    assert.equal(span("2026-03-04", "2026-03-04", "MORNING", "MORNING"), 0.5);
    assert.equal(span("2026-03-04", "2026-03-04", "AFTERNOON", "AFTERNOON"), 0.5);
  });

  it("skips the weekend inside a range", () => {
    // Fri 6 Mar to Mon 9 Mar 2026 -> Fri + Mon
    assert.equal(span("2026-03-06", "2026-03-09"), 2);
  });

  it("counts a full working week as 5", () => {
    assert.equal(span("2026-03-02", "2026-03-06"), 5);
  });

  it("charges half a day when leave starts in the afternoon", () => {
    assert.equal(span("2026-03-02", "2026-03-04", "AFTERNOON", "FULL"), 2.5);
  });

  it("charges half a day when leave ends at midday", () => {
    assert.equal(span("2026-03-02", "2026-03-04", "FULL", "MORNING"), 2.5);
  });

  it("charges both halves when the range starts and ends mid-day", () => {
    assert.equal(span("2026-03-02", "2026-03-04", "AFTERNOON", "MORNING"), 2);
  });

  it("returns 0 for a weekend-only range", () => {
    assert.equal(span("2026-03-07", "2026-03-08"), 0);
  });

  it("returns 0 when the end date precedes the start date", () => {
    assert.equal(span("2026-03-06", "2026-03-02"), 0);
  });

  it("excludes holidays inside the range", () => {
    const holidays = indexHolidays([{ date: d("2026-03-04"), isHalfDay: false, isRecurring: false }]);
    const total = calculateLeaveDays(
      { startDate: d("2026-03-02"), endDate: d("2026-03-06"), startDayPart: "FULL", endDayPart: "FULL" },
      MON_FRI,
      holidays,
    ).totalDays;
    assert.equal(total, 4);
  });

  it("does not charge a half day against a non-working first day", () => {
    // Saturday start: the first counted day is Monday and stays a full day.
    assert.equal(span("2026-03-07", "2026-03-10", "AFTERNOON", "FULL"), 2);
  });
});

describe("calendarSpanDays", () => {
  it("counts both endpoints", () => {
    assert.equal(calendarSpanDays(d("2026-03-02"), d("2026-03-02")), 1);
    assert.equal(calendarSpanDays(d("2026-03-02"), d("2026-03-06")), 5);
  });
});
