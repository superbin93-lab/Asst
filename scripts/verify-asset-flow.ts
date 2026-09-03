/**
 * End-to-end check of the asset lifecycle through the real UI.
 *
 *   npx tsx scripts/verify-asset-flow.ts
 *
 * Creates an asset, assigns it to an employee, checks it back in, and asserts the
 * status, holder and assignment history at every step. Removes its fixture after.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { launchBrowser } from "./lib/browser";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const IT_ADMIN = "cuong.le@company.local";
const SERIAL = "E2E-VERIFY-0001";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const category = await db.assetCategory.findUniqueOrThrow({ where: { code: "MONITOR" } });
  const holder = await db.employee.findFirstOrThrow({ where: { email: "giang.vu@company.local" } });

  // Start from a clean slate so the script is re-runnable.
  await db.asset.deleteMany({ where: { serialNumber: SERIAL } });

  const browser = await launchBrowser({ db, base: BASE, port: 9335, sessionTag: "asset-flow" });
  let assetId: string | null = null;

  try {
    await browser.signInAs(IT_ADMIN);

    // ---- 1. Create -------------------------------------------------------
    await browser.goto(`${BASE}/assets/new`, 3000);
    await browser.evaluate(`window.__set("#name", "Man hinh kiem thu E2E")`);
    await browser.evaluate(`window.__set("#categoryId", ${JSON.stringify(category.id)})`);
    await browser.evaluate(`window.__set("#serialNumber", ${JSON.stringify(SERIAL)})`);
    await browser.evaluate(`window.__set("#purchaseCost", "4500000")`);
    await browser.evaluate(`window.__click("Thêm mới")`);
    await delay(3500);

    const created = await db.asset.findFirst({ where: { serialNumber: SERIAL } });
    assert.ok(created, "the asset was not created");
    assetId = created.id;
    assert.match(created.assetTag, /^AST-\d{4}-\d{4}$/, `unexpected tag ${created.assetTag}`);
    assert.equal(created.status, "IN_STOCK");
    assert.equal(created.purchaseCost?.toString(), "4500000");
    console.log(`  created ${created.assetTag} (${created.status})`);

    const duplicateBlocked = await db.asset.count({ where: { serialNumber: SERIAL } });
    assert.equal(duplicateBlocked, 1);

    // ---- 2. Assign -------------------------------------------------------
    await browser.goto(`${BASE}/assets/${created.id}`, 3000);
    // Outside a dialog this matches the "Cấp phát tài sản" trigger; once the
    // dialog is open the same call resolves to its submit button.
    await browser.evaluate(`window.__click("Cấp phát")`);
    await delay(1200);
    await browser.evaluate(`window.__set("#employeeId", ${JSON.stringify(holder.id)})`);
    await browser.evaluate(`window.__click("Cấp phát")`);
    await delay(3500);

    const assigned = await db.asset.findUniqueOrThrow({
      where: { id: created.id },
      include: { assignments: { orderBy: { assignedAt: "desc" } } },
    });
    assert.equal(assigned.status, "ASSIGNED", "the asset was not marked as assigned");
    assert.equal(assigned.holderId, holder.id, "the holder was not set");
    assert.equal(assigned.departmentId, holder.departmentId, "the department did not follow the holder");
    const active = assigned.assignments.find((a) => a.status === "ACTIVE");
    assert.ok(active, "no active assignment row was written");
    console.log(`  assigned to ${holder.fullName} (${assigned.status})`);

    // ---- 3. Check back in ------------------------------------------------
    await browser.goto(`${BASE}/assets/${created.id}`, 3000);
    await browser.evaluate(`window.__click("Thu hồi")`);
    await delay(1200);
    await browser.evaluate(`window.__set("#conditionIn", "FAIR")`);
    await browser.evaluate(`window.__click("Thu hồi")`);
    await delay(3500);

    const returned = await db.asset.findUniqueOrThrow({
      where: { id: created.id },
      include: { assignments: true, events: true },
    });
    assert.equal(returned.status, "IN_STOCK", "the asset did not return to stock");
    assert.equal(returned.holderId, null, "the holder was not cleared");
    assert.equal(returned.condition, "FAIR", "the check-in condition was not recorded");
    assert.equal(
      returned.assignments.filter((a) => a.status === "ACTIVE").length,
      0,
      "an assignment was left open",
    );
    assert.ok(
      returned.events.some((e) => e.type === "assigned") && returned.events.some((e) => e.type === "returned"),
      "the asset timeline is missing lifecycle events",
    );
    console.log(`  checked in (${returned.status}, condition ${returned.condition})`);

    const audit = await db.auditLog.count({ where: { entityId: created.id, action: { in: ["ASSIGN", "RETURN"] } } });
    assert.equal(audit, 2, "assign/return were not both audited");
    console.log("  audit log recorded both movements");

    console.log("\nAsset lifecycle OK.");
  } finally {
    await browser.close();
    if (assetId) await db.asset.deleteMany({ where: { id: assetId } });
    await db.asset.deleteMany({ where: { serialNumber: SERIAL } });
  }
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
