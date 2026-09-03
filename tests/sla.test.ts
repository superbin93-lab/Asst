import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indexHolidays } from "../src/features/leave/workdays";
import {
  addBusinessMinutes,
  computeSlaTargets,
  MINUTES_PER_BUSINESS_DAY,
  slaState,
} from "../src/features/tickets/sla";

const MON_FRI = [1, 2, 3, 4, 5];
const noHolidays = indexHolidays([]);
const at = (iso: string) => new Date(iso);
const hhmm = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

describe("addBusinessMinutes", () => {
  it("stays inside the same morning", () => {
    // Wed 4 Mar 2026, 09:00 + 60min
    assert.equal(hhmm(addBusinessMinutes(at("2026-03-04T09:00:00"), 60, MON_FRI, noHolidays)), "2026-03-04 10:00");
  });

  it("jumps over the lunch break", () => {
    // 11:30 + 60min -> 30min before noon, 30min after 13:00
    assert.equal(hhmm(addBusinessMinutes(at("2026-03-04T11:30:00"), 60, MON_FRI, noHolidays)), "2026-03-04 13:30");
  });

  it("starts the clock at 08:00 when raised before office hours", () => {
    assert.equal(hhmm(addBusinessMinutes(at("2026-03-04T06:00:00"), 30, MON_FRI, noHolidays)), "2026-03-04 08:30");
  });

  it("rolls to the next morning when raised after hours", () => {
    assert.equal(hhmm(addBusinessMinutes(at("2026-03-04T19:00:00"), 30, MON_FRI, noHolidays)), "2026-03-05 08:30");
  });

  it("skips the weekend", () => {
    // Friday 17:00 + 60min -> 30min Friday, 30min Monday morning
    assert.equal(hhmm(addBusinessMinutes(at("2026-03-06T17:00:00"), 60, MON_FRI, noHolidays)), "2026-03-09 08:30");
  });

  it("skips a public holiday", () => {
    const holidays = indexHolidays([{ date: at("2026-03-05T00:00:00"), isHalfDay: false, isRecurring: false }]);
    // Thu 5 Mar is a holiday, so work resumes Friday morning.
    assert.equal(hhmm(addBusinessMinutes(at("2026-03-04T17:30:00"), 60, MON_FRI, holidays)), "2026-03-06 09:00");
  });

  it("advances exactly one working day for a full day of minutes", () => {
    const result = addBusinessMinutes(at("2026-03-04T08:00:00"), MINUTES_PER_BUSINESS_DAY, MON_FRI, noHolidays);
    assert.equal(hhmm(result), "2026-03-04 17:30");
  });

  it("spans several days for a large budget", () => {
    const result = addBusinessMinutes(at("2026-03-04T08:00:00"), MINUTES_PER_BUSINESS_DAY * 3, MON_FRI, noHolidays);
    assert.equal(hhmm(result), "2026-03-06 17:30");
  });
});

describe("computeSlaTargets", () => {
  it("uses wall-clock time when business hours are off", () => {
    const targets = computeSlaTargets(
      at("2026-03-06T17:00:00"),
      { responseMinutes: 60, resolutionMinutes: 240, businessHoursOnly: false },
      MON_FRI,
      [],
    );
    assert.equal(hhmm(targets.responseDueAt), "2026-03-06 18:00");
    assert.equal(hhmm(targets.resolutionDueAt), "2026-03-06 21:00");
  });

  it("respects business hours when enabled", () => {
    const targets = computeSlaTargets(
      at("2026-03-06T17:00:00"),
      { responseMinutes: 60, resolutionMinutes: 240, businessHoursOnly: true },
      MON_FRI,
      [],
    );
    assert.equal(hhmm(targets.responseDueAt), "2026-03-09 08:30");
    assert.equal(hhmm(targets.resolutionDueAt), "2026-03-09 11:30");
  });
});

describe("slaState", () => {
  const now = at("2026-03-04T12:00:00");

  it("reports none without a deadline", () => {
    assert.equal(slaState(null, null, now).state, "none");
  });

  it("reports onTrack when comfortably ahead", () => {
    assert.equal(slaState(at("2026-03-04T16:00:00"), null, now).state, "onTrack");
  });

  it("reports dueSoon within the last hour", () => {
    assert.equal(slaState(at("2026-03-04T12:30:00"), null, now).state, "dueSoon");
  });

  it("reports breached once the deadline has passed", () => {
    const result = slaState(at("2026-03-04T11:00:00"), null, now);
    assert.equal(result.state, "breached");
    assert.equal(result.minutes, -60);
  });

  it("reports met when finished before the deadline", () => {
    assert.equal(slaState(at("2026-03-04T16:00:00"), at("2026-03-04T10:00:00"), now).state, "met");
  });

  it("reports breached when finished after the deadline", () => {
    assert.equal(slaState(at("2026-03-04T09:00:00"), at("2026-03-04T10:00:00"), now).state, "breached");
  });
});
