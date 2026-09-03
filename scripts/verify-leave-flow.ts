/**
 * End-to-end check of the leave workflow through the real UI.
 *
 *   npx tsx scripts/verify-leave-flow.ts
 *
 * An employee files a request, an overlapping one is refused, and their manager
 * approves it; the script asserts the balance moves through pending into used
 * exactly once. Rolls its fixture back so it can be re-run.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { launchBrowser } from "./lib/browser";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const EMPLOYEE = "giang.vu@company.local";
const APPROVER = "em.hoang@company.local";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/** A Monday a couple of weeks out, so notice-period rules are satisfied. */
function nextMonday(offsetWeeks = 2): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetWeeks * 7);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function main() {
  const employee = await db.employee.findFirstOrThrow({ where: { email: EMPLOYEE } });
  const annual = await db.leaveType.findUniqueOrThrow({ where: { code: "ANNUAL" } });
  const year = new Date().getFullYear();

  const before = await db.leaveBalance.findUniqueOrThrow({
    where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: annual.id, year } },
  });

  const start = nextMonday();
  const end = new Date(start);
  end.setDate(end.getDate() + 2); // Mon-Wed => three working days

  const browser = await launchBrowser({ db, base: BASE, port: 9334, sessionTag: "leave-flow" });
  let createdId: string | null = null;

  try {
    // ---- 1. The employee files the request -------------------------------
    await browser.signInAs(EMPLOYEE);
    await browser.goto(`${BASE}/leave/new`, 3000);

    await browser.evaluate(`window.__set("#leaveTypeId", ${JSON.stringify(annual.id)})`);
    await browser.evaluate(`window.__set("#startDate", ${JSON.stringify(iso(start))})`);
    await browser.evaluate(`window.__set("#endDate", ${JSON.stringify(iso(end))})`);
    await browser.evaluate(`window.__set("#reason", "Kiem thu tu dong luong nghi phep")`);

    const estimate = await browser.evaluate<string>(
      `document.querySelector("main strong.tabular")?.textContent ?? ""`,
    );
    assert.equal(estimate.trim(), "3", `the form should estimate 3 days, saw "${estimate}"`);
    console.log("  form estimated 3 working days");

    await browser.evaluate(`window.__click("Gửi")`);
    await delay(3500);

    const created = await db.leaveRequest.findFirst({
      where: { employeeId: employee.id, startDate: start },
      include: { approvals: { orderBy: { step: "asc" } } },
    });
    assert.ok(created, "the request was not created");
    createdId = created.id;
    assert.equal(created.status, "PENDING");
    assert.equal(created.totalDays, 3);
    assert.match(created.code, /^LV-\d{4}-\d{4}$/, `unexpected code ${created.code}`);
    assert.ok(created.approvals.length >= 1, "no approval steps were created");
    console.log(`  created ${created.code}: ${created.totalDays} days, ${created.approvals.length} approval step(s)`);

    const reserved = await db.leaveBalance.findUniqueOrThrow({ where: { id: before.id } });
    assert.equal(reserved.pendingDays, before.pendingDays + 3, "the days were not reserved");
    assert.equal(reserved.usedDays, before.usedDays, "used days changed too early");
    console.log(`  balance reserved: pending ${before.pendingDays} -> ${reserved.pendingDays}`);

    // ---- 2. An overlapping request must be refused ------------------------
    await browser.goto(`${BASE}/leave/new`, 2500);
    await browser.evaluate(`window.__set("#leaveTypeId", ${JSON.stringify(annual.id)})`);
    await browser.evaluate(`window.__set("#startDate", ${JSON.stringify(iso(start))})`);
    await browser.evaluate(`window.__set("#endDate", ${JSON.stringify(iso(end))})`);
    await browser.evaluate(`window.__set("#reason", "Trung lich - phai bi tu choi")`);
    await browser.evaluate(`window.__click("Gửi")`);
    await delay(3000);

    const live = await db.leaveRequest.count({
      where: { employeeId: employee.id, startDate: start, status: { in: ["PENDING", "APPROVED"] } },
    });
    assert.equal(live, 1, "an overlapping request was accepted");
    console.log("  overlapping request correctly rejected");

    // ---- 3. The manager approves ------------------------------------------
    await browser.signInAs(APPROVER);
    await browser.goto(`${BASE}/leave/${created.id}`, 3000);
    await browser.evaluate(`window.__click("Duyệt")`);
    await delay(1200);
    await browser.evaluate(`window.__click("Xác nhận")`);
    await delay(3500);

    const decided = await db.leaveRequest.findUniqueOrThrow({
      where: { id: created.id },
      include: { approvals: { orderBy: { step: "asc" } } },
    });
    assert.equal(decided.approvals[0].status, "APPROVED", "step 1 was not approved");
    console.log(`  step 1 approved; request status is ${decided.status}`);

    const after = await db.leaveBalance.findUniqueOrThrow({ where: { id: before.id } });
    if (decided.status === "APPROVED") {
      assert.equal(after.usedDays, before.usedDays + 3, "the days were not moved into used");
      assert.equal(after.pendingDays, before.pendingDays, "the reservation was not released");
      console.log(`  balance settled: used ${before.usedDays} -> ${after.usedDays}`);
    } else {
      // Two-level policy: HR still has to sign off, so the reservation stays put.
      assert.equal(after.pendingDays, before.pendingDays + 3, "the reservation moved too early");
      assert.equal(after.usedDays, before.usedDays, "used days changed before final approval");
      console.log("  awaiting the next approval step; reservation held");
    }

    console.log("\nLeave workflow OK.");
  } finally {
    await browser.close();
    if (createdId) {
      await db.leaveRequest.deleteMany({ where: { id: createdId } });
      await db.leaveBalance.update({
        where: { id: before.id },
        data: { pendingDays: before.pendingDays, usedDays: before.usedDays },
      });
    }
    await db.notification.deleteMany({ where: { type: { startsWith: "leave." } } });
  }
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
