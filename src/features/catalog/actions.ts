"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import { assetCategorySchema, locationSchema, vendorSchema } from "./schema";
import { slaPolicySchema, ticketCategorySchema } from "@/features/tickets/schema";
import { holidaySchema, leaveTypeSchema } from "@/features/leave/schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

function revalidateCatalog() {
  revalidatePath("/catalog/categories");
  revalidatePath("/catalog/locations");
  revalidatePath("/catalog/vendors");
  revalidatePath("/catalog/ticket-categories");
  revalidatePath("/catalog/sla");
  revalidatePath("/catalog/leave-types");
  revalidatePath("/catalog/holidays");
  revalidatePath("/assets");
}

export async function saveAssetCategory(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATALOG_MANAGE);
    const parsed = assetCategorySchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    if (id && input.parentId === id) return fail("validation", { parentId: "duplicate" });

    const clash = await db.assetCategory.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const row = id
      ? await db.assetCategory.update({ where: { id }, data: input })
      : await db.assetCategory.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "AssetCategory", entityId: row.id,
      userId: user.id, summary: `${row.code} - ${row.name}`,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteAssetCategory(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATALOG_MANAGE);
    const row = await db.assetCategory.findUnique({
      where: { id },
      select: { code: true, _count: { select: { assets: true, children: true } } },
    });
    if (!row) return fail("notFound");
    if (row._count.assets > 0 || row._count.children > 0) return fail("cannotDeleteInUse");

    await db.assetCategory.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "AssetCategory", entityId: id, userId: user.id, summary: row.code });
    revalidateCatalog();
    return ok(undefined);
  });
}

export async function saveLocation(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATALOG_MANAGE);
    const parsed = locationSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    if (id && input.parentId === id) return fail("validation", { parentId: "duplicate" });

    const clash = await db.location.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const row = id
      ? await db.location.update({ where: { id }, data: input })
      : await db.location.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Location", entityId: row.id,
      userId: user.id, summary: `${row.code} - ${row.name}`,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATALOG_MANAGE);
    const row = await db.location.findUnique({
      where: { id },
      select: { code: true, _count: { select: { assets: true, children: true, employees: true } } },
    });
    if (!row) return fail("notFound");
    if (row._count.assets > 0 || row._count.children > 0 || row._count.employees > 0) {
      return fail("cannotDeleteInUse");
    }

    await db.location.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "Location", entityId: id, userId: user.id, summary: row.code });
    revalidateCatalog();
    return ok(undefined);
  });
}

export async function saveVendor(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATALOG_MANAGE);
    const parsed = vendorSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const clash = await db.vendor.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const row = id
      ? await db.vendor.update({ where: { id }, data: input })
      : await db.vendor.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Vendor", entityId: row.id,
      userId: user.id, summary: `${row.code} - ${row.name}`,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteVendor(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATALOG_MANAGE);
    const row = await db.vendor.findUnique({
      where: { id },
      select: {
        code: true,
        _count: { select: { manufacturedAssets: true, suppliedAssets: true, licenses: true } },
      },
    });
    if (!row) return fail("notFound");
    if (row._count.manufacturedAssets + row._count.suppliedAssets + row._count.licenses > 0) {
      return fail("cannotDeleteInUse");
    }

    await db.vendor.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "Vendor", entityId: id, userId: user.id, summary: row.code });
    revalidateCatalog();
    return ok(undefined);
  });
}

export async function saveTicketCategory(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_CONFIG);
    const parsed = ticketCategorySchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    if (id && input.parentId === id) return fail("validation", { parentId: "duplicate" });

    const clash = await db.ticketCategory.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const row = id
      ? await db.ticketCategory.update({ where: { id }, data: input })
      : await db.ticketCategory.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "TicketCategory", entityId: row.id,
      userId: user.id, summary: `${row.code} - ${row.name}`,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteTicketCategory(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_CONFIG);
    const row = await db.ticketCategory.findUnique({
      where: { id },
      select: { code: true, _count: { select: { tickets: true, children: true } } },
    });
    if (!row) return fail("notFound");
    if (row._count.tickets > 0 || row._count.children > 0) return fail("cannotDeleteInUse");

    await db.ticketCategory.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "TicketCategory", entityId: id, userId: user.id, summary: row.code });
    revalidateCatalog();
    return ok(undefined);
  });
}

export async function saveSlaPolicy(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_CONFIG);
    const parsed = slaPolicySchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const clash = await db.slaPolicy.findFirst({ where: { name: input.name, priority: input.priority } });
    if (clash && clash.id !== id) return fail("validation", { name: "duplicate" });

    const row = id
      ? await db.slaPolicy.update({ where: { id }, data: input })
      : await db.slaPolicy.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "SlaPolicy", entityId: row.id,
      userId: user.id, summary: `${row.name} / ${row.priority}`,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteSlaPolicy(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_CONFIG);
    const row = await db.slaPolicy.findUnique({
      where: { id },
      select: { name: true, priority: true, _count: { select: { categories: true } } },
    });
    if (!row) return fail("notFound");
    if (row._count.categories > 0) return fail("cannotDeleteInUse");

    await db.slaPolicy.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "SlaPolicy", entityId: id, userId: user.id,
      summary: `${row.name} / ${row.priority}`,
    });
    revalidateCatalog();
    return ok(undefined);
  });
}

export async function saveLeaveType(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_MANAGE);
    const parsed = leaveTypeSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const clash = await db.leaveType.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const row = id
      ? await db.leaveType.update({ where: { id }, data: input })
      : await db.leaveType.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "LeaveType", entityId: row.id,
      userId: user.id, summary: `${row.code} - ${row.name}`,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteLeaveType(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_MANAGE);
    const row = await db.leaveType.findUnique({
      where: { id },
      select: { code: true, _count: { select: { requests: true, balances: true } } },
    });
    if (!row) return fail("notFound");
    if (row._count.requests > 0) return fail("cannotDeleteInUse");

    await db.leaveType.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "LeaveType", entityId: id, userId: user.id, summary: row.code });
    revalidateCatalog();
    return ok(undefined);
  });
}

export async function saveHoliday(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_MANAGE);
    const parsed = holidaySchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const row = id
      ? await db.holiday.update({ where: { id }, data: input })
      : await db.holiday.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Holiday", entityId: row.id,
      userId: user.id, summary: row.name,
    });
    revalidateCatalog();
    return ok({ id: row.id });
  });
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_MANAGE);
    const row = await db.holiday.findUnique({ where: { id }, select: { name: true } });
    if (!row) return fail("notFound");

    await db.holiday.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "Holiday", entityId: id, userId: user.id, summary: row.name });
    revalidateCatalog();
    return ok(undefined);
  });
}
