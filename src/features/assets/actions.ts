"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit, diffFields } from "@/lib/audit";
import { nextAssetTag } from "@/lib/sequence";
import { addMonths } from "@/lib/utils";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import {
  assetInputSchema, assignAssetSchema, returnAssetSchema, maintenanceSchema, disposeAssetSchema,
} from "./schema";

function revalidateAsset(id?: string) {
  revalidatePath("/assets");
  revalidatePath("/assets/assignments");
  revalidatePath("/assets/maintenance");
  if (id) revalidatePath(`/assets/${id}`);
  revalidatePath("/");
}

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

export async function createAsset(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_CREATE);
    const parsed = assetInputSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;

    if (input.assetTag) {
      const clash = await db.asset.findUnique({ where: { assetTag: input.assetTag } });
      if (clash) return fail("validation", { assetTag: "assetTagTaken" });
    }
    if (input.serialNumber) {
      const clash = await db.asset.findFirst({ where: { serialNumber: input.serialNumber } });
      if (clash) return fail("validation", { serialNumber: "serialTaken" });
    }

    // Warranty end is derived when the user supplied a duration but no date.
    const warrantyEndAt =
      input.warrantyEndAt ??
      (input.purchaseDate && input.warrantyMonths
        ? addMonths(input.purchaseDate, input.warrantyMonths)
        : undefined);

    const asset = await db.asset.create({
      data: {
        ...input,
        assetTag: input.assetTag ?? (await nextAssetTag()),
        warrantyEndAt,
        specs: input.specs as never,
        createdById: user.id,
      },
    });

    await db.assetEvent.create({
      data: { assetId: asset.id, type: "created", message: asset.assetTag, actorId: user.id },
    });
    await recordAudit({
      action: "CREATE", entityType: "Asset", entityId: asset.id, userId: user.id,
      summary: `${asset.assetTag} - ${asset.name}`,
    });

    revalidateAsset(asset.id);
    return ok({ id: asset.id });
  });
}

export async function updateAsset(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_UPDATE);
    const parsed = assetInputSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const before = await db.asset.findUnique({ where: { id } });
    if (!before) return fail("notFound");

    const input = parsed.data;

    if (input.assetTag && input.assetTag !== before.assetTag) {
      const clash = await db.asset.findUnique({ where: { assetTag: input.assetTag } });
      if (clash) return fail("validation", { assetTag: "assetTagTaken" });
    }
    if (input.serialNumber && input.serialNumber !== before.serialNumber) {
      const clash = await db.asset.findFirst({ where: { serialNumber: input.serialNumber } });
      if (clash) return fail("validation", { serialNumber: "serialTaken" });
    }

    const warrantyEndAt =
      input.warrantyEndAt ??
      (input.purchaseDate && input.warrantyMonths
        ? addMonths(input.purchaseDate, input.warrantyMonths)
        : null);

    const asset = await db.asset.update({
      where: { id },
      data: { ...input, assetTag: input.assetTag ?? before.assetTag, warrantyEndAt, specs: input.specs as never },
    });

    const changes = diffFields(before as never, asset as never);
    if (Object.keys(changes).length > 0) {
      await db.assetEvent.create({
        data: { assetId: id, type: "updated", message: Object.keys(changes).join(", "), meta: changes as never, actorId: user.id },
      });
      if (before.status !== asset.status) {
        await db.assetEvent.create({
          data: {
            assetId: id, type: "status", message: `${before.status} -> ${asset.status}`, actorId: user.id,
          },
        });
      }
      await recordAudit({
        action: "UPDATE", entityType: "Asset", entityId: id, userId: user.id,
        summary: `${asset.assetTag} - ${asset.name}`, changes,
      });
    }

    revalidateAsset(id);
    return ok({ id });
  });
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_DELETE);
    const asset = await db.asset.findUnique({ where: { id }, select: { assetTag: true, name: true, status: true } });
    if (!asset) return fail("notFound");
    if (asset.status === "ASSIGNED") return fail("assetAssigned");

    await db.asset.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "Asset", entityId: id, userId: user.id,
      summary: `${asset.assetTag} - ${asset.name}`,
    });

    revalidateAsset();
    return ok(undefined);
  });
}

export async function assignAsset(formData: FormData): Promise<ActionResult<{ assignmentId: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_ASSIGN);
    const parsed = assignAssetSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { assetId, employeeId, assignedAt, expectedReturnAt, conditionOut, locationId, note } = parsed.data;

    const [asset, employee] = await Promise.all([
      db.asset.findUnique({ where: { id: assetId }, select: { id: true, assetTag: true, status: true } }),
      db.employee.findUnique({ where: { id: employeeId }, select: { id: true, fullName: true, departmentId: true } }),
    ]);
    if (!asset || !employee) return fail("notFound");
    if (asset.status !== "IN_STOCK" && asset.status !== "RESERVED") return fail("notAssignable");

    const assignment = await db.$transaction(async (tx) => {
      // Close any assignment left open by earlier data before opening a new one.
      await tx.assetAssignment.updateMany({
        where: { assetId, status: "ACTIVE" },
        data: { status: "RETURNED", returnedAt: new Date() },
      });

      const created = await tx.assetAssignment.create({
        data: {
          assetId,
          employeeId,
          assignedAt: assignedAt ?? new Date(),
          expectedReturnAt,
          conditionOut,
          issuedById: user.id,
          note,
          status: "ACTIVE",
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: "ASSIGNED",
          holderId: employeeId,
          departmentId: employee.departmentId,
          condition: conditionOut,
          ...(locationId ? { locationId } : {}),
        },
      });

      await tx.assetEvent.create({
        data: { assetId, type: "assigned", message: employee.fullName, actorId: user.id },
      });

      return created;
    });

    await recordAudit({
      action: "ASSIGN", entityType: "Asset", entityId: assetId, userId: user.id,
      summary: `${asset.assetTag} -> ${employee.fullName}`,
    });

    revalidateAsset(assetId);
    revalidatePath(`/employees/${employeeId}`);
    return ok({ assignmentId: assignment.id });
  });
}

export async function returnAsset(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_ASSIGN);
    const parsed = returnAssetSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { assignmentId, returnedAt, conditionIn, locationId, nextStatus, note } = parsed.data;

    const assignment = await db.assetAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        asset: { select: { id: true, assetTag: true } },
        employee: { select: { id: true, fullName: true } },
      },
    });
    if (!assignment) return fail("notFound");
    if (assignment.status === "RETURNED") return fail("alreadyReturned");

    await db.$transaction(async (tx) => {
      await tx.assetAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "RETURNED",
          returnedAt: returnedAt ?? new Date(),
          conditionIn,
          receivedById: user.id,
          note: note ?? assignment.note,
        },
      });

      await tx.asset.update({
        where: { id: assignment.assetId },
        data: {
          status: nextStatus,
          holderId: null,
          condition: conditionIn,
          ...(locationId ? { locationId } : {}),
        },
      });

      await tx.assetEvent.create({
        data: { assetId: assignment.assetId, type: "returned", message: assignment.employee.fullName, actorId: user.id },
      });
    });

    await recordAudit({
      action: "RETURN", entityType: "Asset", entityId: assignment.assetId, userId: user.id,
      summary: `${assignment.asset.assetTag} <- ${assignment.employee.fullName}`,
    });

    revalidateAsset(assignment.assetId);
    revalidatePath(`/employees/${assignment.employeeId}`);
    return ok(undefined);
  });
}

export async function disposeAsset(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_UPDATE);
    const parsed = disposeAssetSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { assetId, disposedAt, disposalNote } = parsed.data;
    const asset = await db.asset.findUnique({ where: { id: assetId }, select: { assetTag: true, status: true } });
    if (!asset) return fail("notFound");
    if (asset.status === "ASSIGNED") return fail("assetAssigned");

    await db.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: assetId },
        data: { status: "DISPOSED", disposedAt: disposedAt ?? new Date(), disposalNote, holderId: null },
      });
      await tx.assetEvent.create({
        data: { assetId, type: "disposed", message: disposalNote, actorId: user.id },
      });
    });

    await recordAudit({
      action: "UPDATE", entityType: "Asset", entityId: assetId, userId: user.id,
      summary: `Thanh ly ${asset.assetTag}`,
    });

    revalidateAsset(assetId);
    return ok(undefined);
  });
}

export async function saveMaintenance(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_MAINTAIN);
    const parsed = maintenanceSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const asset = await db.asset.findUnique({ where: { id: input.assetId }, select: { id: true, status: true } });
    if (!asset) return fail("notFound");

    const record = id
      ? await db.assetMaintenance.update({ where: { id }, data: input })
      : await db.assetMaintenance.create({ data: input });

    // An open repair puts the asset into IN_REPAIR; completing it releases the
    // asset back to stock unless somebody is still holding it.
    if (record.status === "IN_PROGRESS" && asset.status !== "IN_REPAIR") {
      await db.asset.update({ where: { id: input.assetId }, data: { status: "IN_REPAIR" } });
    } else if (record.status === "COMPLETED" && asset.status === "IN_REPAIR") {
      const openAssignment = await db.assetAssignment.findFirst({
        where: { assetId: input.assetId, status: "ACTIVE" },
        select: { id: true },
      });
      await db.asset.update({
        where: { id: input.assetId },
        data: { status: openAssignment ? "ASSIGNED" : "IN_STOCK" },
      });
    }

    await db.assetEvent.create({
      data: {
        assetId: input.assetId,
        type: record.status === "COMPLETED" ? "maintenance_closed" : "maintenance_opened",
        message: record.title,
        actorId: user.id,
      },
    });
    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "AssetMaintenance", entityId: record.id,
      userId: user.id, summary: record.title,
    });

    revalidateAsset(input.assetId);
    return ok({ id: record.id });
  });
}

export async function deleteMaintenance(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ASSET_MAINTAIN);
    const record = await db.assetMaintenance.findUnique({ where: { id }, select: { assetId: true, title: true } });
    if (!record) return fail("notFound");

    await db.assetMaintenance.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "AssetMaintenance", entityId: id, userId: user.id, summary: record.title,
    });

    revalidateAsset(record.assetId);
    return ok(undefined);
  });
}
