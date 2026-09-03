"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { nextConsumableCode } from "@/lib/sequence";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import {
  consumableSchema,
  licenseSchema,
  licenseSeatSchema,
  stockMovementSchema,
} from "@/features/catalog/schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

export async function saveLicense(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LICENSE_MANAGE);
    const parsed = licenseSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;

    // Shrinking a licence below the seats already handed out would corrupt the count.
    if (id) {
      const used = await db.licenseSeat.count({ where: { licenseId: id, revokedAt: null } });
      if (input.seatsTotal < used) return fail("validation", { seatsTotal: "min" });
    }

    const row = id
      ? await db.softwareLicense.update({ where: { id }, data: input })
      : await db.softwareLicense.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "SoftwareLicense", entityId: row.id,
      userId: user.id, summary: row.name,
    });

    revalidatePath("/licenses");
    return ok({ id: row.id });
  });
}

export async function deleteLicense(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LICENSE_MANAGE);
    const row = await db.softwareLicense.findUnique({ where: { id }, select: { name: true } });
    if (!row) return fail("notFound");

    await db.softwareLicense.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "SoftwareLicense", entityId: id, userId: user.id, summary: row.name,
    });

    revalidatePath("/licenses");
    return ok(undefined);
  });
}

export async function assignLicenseSeat(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LICENSE_MANAGE);
    const parsed = licenseSeatSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { licenseId, employeeId, assetId, note } = parsed.data;
    if (!employeeId && !assetId) return fail("validation", { employeeId: "required" });

    const license = await db.softwareLicense.findUnique({
      where: { id: licenseId },
      select: { name: true, seatsTotal: true, _count: { select: { seats: { where: { revokedAt: null } } } } },
    });
    if (!license) return fail("notFound");
    if (license._count.seats >= license.seatsTotal) return fail("noSeatsLeft");

    await db.licenseSeat.create({ data: { licenseId, employeeId, assetId, note } });
    await recordAudit({
      action: "ASSIGN", entityType: "SoftwareLicense", entityId: licenseId, userId: user.id,
      summary: license.name,
    });

    revalidatePath("/licenses");
    revalidatePath(`/licenses/${licenseId}`);
    return ok(undefined);
  });
}

export async function revokeLicenseSeat(seatId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LICENSE_MANAGE);
    const seat = await db.licenseSeat.findUnique({
      where: { id: seatId },
      select: { licenseId: true, license: { select: { name: true } } },
    });
    if (!seat) return fail("notFound");

    await db.licenseSeat.update({ where: { id: seatId }, data: { revokedAt: new Date() } });
    await recordAudit({
      action: "RETURN", entityType: "SoftwareLicense", entityId: seat.licenseId, userId: user.id,
      summary: seat.license.name,
    });

    revalidatePath("/licenses");
    revalidatePath(`/licenses/${seat.licenseId}`);
    return ok(undefined);
  });
}

export async function saveConsumable(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CONSUMABLE_MANAGE);
    const parsed = consumableSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    if (input.code) {
      const clash = await db.consumable.findUnique({ where: { code: input.code } });
      if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });
    }

    const row = id
      ? await db.consumable.update({ where: { id }, data: input })
      : await db.consumable.create({ data: { ...input, code: input.code ?? (await nextConsumableCode()) } });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Consumable", entityId: row.id,
      userId: user.id, summary: `${row.code} - ${row.name}`,
    });

    revalidatePath("/consumables");
    return ok({ id: row.id });
  });
}

export async function deleteConsumable(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CONSUMABLE_MANAGE);
    const row = await db.consumable.findUnique({ where: { id }, select: { code: true, quantity: true } });
    if (!row) return fail("notFound");
    if (row.quantity !== 0) return fail("cannotDeleteInUse");

    await db.consumable.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "Consumable", entityId: id, userId: user.id, summary: row.code,
    });

    revalidatePath("/consumables");
    return ok(undefined);
  });
}

/**
 * Applies a stock movement and writes the resulting balance onto the ledger row,
 * so the history is auditable without recomputing every prior transaction.
 */
export async function recordStockMovement(formData: FormData): Promise<ActionResult<{ balance: number }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CONSUMABLE_MANAGE);
    const parsed = stockMovementSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { consumableId, type, quantity, employeeId, note } = parsed.data;

    const consumable = await db.consumable.findUnique({
      where: { id: consumableId },
      select: { code: true, name: true, quantity: true },
    });
    if (!consumable) return fail("notFound");

    const delta = type === "IN" ? Math.abs(quantity) : type === "OUT" ? -Math.abs(quantity) : quantity;
    const balance = consumable.quantity + delta;
    if (balance < 0) return fail("insufficientStock");

    await db.$transaction(async (tx) => {
      await tx.consumable.update({ where: { id: consumableId }, data: { quantity: balance } });
      await tx.stockTransaction.create({
        data: {
          consumableId,
          type,
          quantity: Math.abs(quantity),
          balanceAfter: balance,
          employeeId,
          actorId: user.id,
          note,
        },
      });
    });

    await recordAudit({
      action: "UPDATE", entityType: "Consumable", entityId: consumableId, userId: user.id,
      summary: `${consumable.code} ${type} ${Math.abs(quantity)} -> ${balance}`,
    });

    revalidatePath("/consumables");
    return ok({ balance });
  });
}
