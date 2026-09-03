"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize, authorizeSession } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { nextLeaveCode } from "@/lib/sequence";
import { getSettings } from "@/lib/settings";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import { calculateLeaveDays, calendarSpanDays, indexHolidays } from "./workdays";
import { approvalDecisionSchema, cancelRequestSchema, leaveRequestSchema } from "./schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

function revalidateLeave(id?: string) {
  revalidatePath("/leave");
  revalidatePath("/leave/approvals");
  revalidatePath("/leave/requests");
  revalidatePath("/leave/balances");
  if (id) revalidatePath(`/leave/${id}`);
  revalidatePath("/");
}

/**
 * Approval chain for an employee.
 *
 * Step 1 is the line manager (falling back to the department head), step 2 is
 * HR when the company runs two levels. Steps that resolve to nobody, or to the
 * requester themselves, are dropped rather than blocking the request.
 */
async function buildApprovalChain(employeeId: string, requesterUserId: string | null): Promise<string[]> {
  const settings = await getSettings();

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      manager: { select: { user: { select: { id: true, isActive: true } } } },
      department: {
        select: { manager: { select: { user: { select: { id: true, isActive: true } } } } },
      },
    },
  });

  const chain: string[] = [];

  const lineManager = employee?.manager?.user ?? employee?.department?.manager?.user ?? null;
  if (lineManager?.isActive && lineManager.id !== requesterUserId) chain.push(lineManager.id);

  if (settings.approvalLevels >= 2) {
    const hr = await db.user.findFirst({
      where: {
        isActive: true,
        id: { notIn: [...chain, ...(requesterUserId ? [requesterUserId] : [])] },
        OR: [
          { roles: { some: { role: { permissions: { some: { permission: PERMISSIONS.LEAVE_MANAGE } } } } } },
          { isSuperAdmin: true },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (hr) chain.push(hr.id);
  }

  return chain;
}

type ValidationOutcome =
  | { ok: true; totalDays: number }
  | { ok: false; field: string; message: string; values?: Record<string, string | number> };

async function validateLeaveWindow(input: {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  startDayPart: "FULL" | "MORNING" | "AFTERNOON";
  endDayPart: "FULL" | "MORNING" | "AFTERNOON";
  excludeRequestId?: string;
}): Promise<ValidationOutcome> {
  if (input.endDate < input.startDate) {
    return { ok: false, field: "endDate", message: "endBeforeStart" };
  }

  const [type, settings, holidays] = await Promise.all([
    db.leaveType.findUnique({ where: { id: input.leaveTypeId } }),
    getSettings(),
    db.holiday.findMany({ select: { date: true, isHalfDay: true, isRecurring: true } }),
  ]);
  if (!type) return { ok: false, field: "leaveTypeId", message: "notFound" };

  const halfDayRequested = input.startDayPart !== "FULL" || input.endDayPart !== "FULL";
  if (halfDayRequested && !type.allowHalfDay) {
    return { ok: false, field: "startDayPart", message: "halfDayNotAllowed" };
  }

  const { totalDays } = calculateLeaveDays(input, settings.workweek, indexHolidays(holidays));
  if (totalDays <= 0) return { ok: false, field: "startDate", message: "noWorkingDays" };

  if (type.maxConsecutiveDays && calendarSpanDays(input.startDate, input.endDate) > type.maxConsecutiveDays) {
    return {
      ok: false, field: "endDate", message: "maxConsecutiveExceeded",
      values: { max: type.maxConsecutiveDays },
    };
  }

  if (type.minNoticeDays > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const noticeDays = Math.round((input.startDate.getTime() - today.getTime()) / 86_400_000);
    if (noticeDays < type.minNoticeDays) {
      return { ok: false, field: "startDate", message: "minNoticeNotMet", values: { days: type.minNoticeDays } };
    }
  }

  // Any pending or approved request touching the same dates blocks a new one.
  const overlap = await db.leaveRequest.findFirst({
    where: {
      employeeId: input.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
      ...(input.excludeRequestId ? { id: { not: input.excludeRequestId } } : {}),
    },
    select: { code: true },
  });
  if (overlap) {
    return { ok: false, field: "startDate", message: "overlapping", values: { code: overlap.code } };
  }

  if (type.deductsBalance) {
    const year = input.startDate.getFullYear();
    const balance = await db.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId: input.employeeId, leaveTypeId: type.id, year } },
    });
    const available = balance
      ? balance.entitledDays + balance.carriedOverDays + balance.adjustmentDays - balance.usedDays - balance.pendingDays
      : 0;
    if (totalDays > available) {
      return {
        ok: false, field: "leaveTypeId", message: "insufficientBalance",
        values: { available, requested: totalDays },
      };
    }
  }

  return { ok: true, totalDays };
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorizeSession();
    const parsed = leaveRequestSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;

    // Only HR may file a request on somebody else's behalf.
    const employeeId = can(user, PERMISSIONS.LEAVE_MANAGE)
      ? (input.employeeId ?? user.employeeId)
      : user.employeeId;
    if (!employeeId) return fail("noEmployeeProfile");

    const check = await validateLeaveWindow({ ...input, employeeId });
    if (!check.ok) return fail("validation", { [check.field]: check.message });

    const chain = input.saveAsDraft ? [] : await buildApprovalChain(employeeId, user.id);
    if (!input.saveAsDraft && chain.length === 0) {
      return fail("validation", { employeeId: "noApprover" });
    }

    const request = await db.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
        data: {
          code: await nextLeaveCode(tx),
          employeeId,
          leaveTypeId: input.leaveTypeId,
          status: input.saveAsDraft ? "DRAFT" : "PENDING",
          startDate: input.startDate,
          endDate: input.endDate,
          startDayPart: input.startDayPart,
          endDayPart: input.endDayPart,
          totalDays: check.totalDays,
          reason: input.reason,
          contactPhone: input.contactPhone,
          handoverToId: input.handoverToId,
          handoverNote: input.handoverNote,
          submittedAt: input.saveAsDraft ? null : new Date(),
        },
      });

      if (chain.length > 0) {
        await tx.leaveApproval.createMany({
          data: chain.map((approverId, index) => ({
            requestId: created.id,
            approverId,
            step: index + 1,
            status: "PENDING",
          })),
        });

        // Reserve the days so a second request cannot spend the same balance.
        const type = await tx.leaveType.findUniqueOrThrow({ where: { id: input.leaveTypeId } });
        if (type.deductsBalance) {
          await tx.leaveBalance.updateMany({
            where: { employeeId, leaveTypeId: type.id, year: input.startDate.getFullYear() },
            data: { pendingDays: { increment: check.totalDays } },
          });
        }
      }

      return created;
    });

    if (chain.length > 0) {
      await db.notification.create({
        data: {
          userId: chain[0],
          type: "leave.pending",
          title: request.code,
          body: input.reason.slice(0, 160),
          link: `/leave/${request.id}`,
        },
      });
    }

    await recordAudit({
      action: "CREATE", entityType: "LeaveRequest", entityId: request.id, userId: user.id,
      summary: `${request.code} (${check.totalDays})`,
    });

    revalidateLeave(request.id);
    return ok({ id: request.id });
  });
}

export async function submitLeaveRequest(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorizeSession();
    const request = await db.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true },
    });
    if (!request) return fail("notFound");
    if (request.status !== "DRAFT") return fail("notDraft");
    if (request.employeeId !== user.employeeId && !can(user, PERMISSIONS.LEAVE_MANAGE)) {
      return fail("forbidden");
    }

    const check = await validateLeaveWindow({
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      startDayPart: request.startDayPart,
      endDayPart: request.endDayPart,
      excludeRequestId: request.id,
    });
    if (!check.ok) return fail("validation", { [check.field]: check.message });

    const chain = await buildApprovalChain(request.employeeId, user.id);
    if (chain.length === 0) return fail("validation", { employeeId: "noApprover" });

    await db.$transaction(async (tx) => {
      await tx.leaveApproval.deleteMany({ where: { requestId: id } });
      await tx.leaveApproval.createMany({
        data: chain.map((approverId, index) => ({
          requestId: id,
          approverId,
          step: index + 1,
          status: "PENDING" as const,
        })),
      });
      await tx.leaveRequest.update({
        where: { id },
        data: { status: "PENDING", submittedAt: new Date(), totalDays: check.totalDays },
      });
      if (request.leaveType.deductsBalance) {
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getFullYear(),
          },
          data: { pendingDays: { increment: check.totalDays } },
        });
      }
    });

    await db.notification.create({
      data: {
        userId: chain[0], type: "leave.pending", title: request.code,
        body: request.reason.slice(0, 160), link: `/leave/${id}`,
      },
    });

    revalidateLeave(id);
    return ok(undefined);
  });
}

export async function decideLeaveRequest(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_APPROVE);
    const parsed = approvalDecisionSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { requestId, decision, comment } = parsed.data;
    if (decision === "REJECTED" && !comment) {
      return fail("validation", { comment: "rejectReasonRequired" });
    }

    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { approvals: { orderBy: { step: "asc" } }, leaveType: true },
    });
    if (!request) return fail("notFound");
    if (request.status !== "PENDING") return fail("notPending");

    const currentStep = request.approvals.find((a) => a.status === "PENDING");
    if (!currentStep) return fail("notPending");

    // HR may act on any step; everybody else only on the step assigned to them.
    const isAssigned = currentStep.approverId === user.id;
    if (!isAssigned && !can(user, PERMISSIONS.LEAVE_MANAGE)) return fail("notYourTurn");

    const now = new Date();
    const laterSteps = request.approvals.filter((a) => a.step > currentStep.step && a.status === "PENDING");
    const isFinalStep = laterSteps.length === 0;
    const balanceWhere = {
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      year: request.startDate.getFullYear(),
    };

    await db.$transaction(async (tx) => {
      await tx.leaveApproval.update({
        where: { id: currentStep.id },
        data: { status: decision, comment, actedAt: now, approverId: user.id },
      });

      if (decision === "REJECTED") {
        await tx.leaveApproval.updateMany({
          where: { requestId, status: "PENDING" },
          data: { status: "SKIPPED", actedAt: now },
        });
        await tx.leaveRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED", decidedAt: now },
        });
        if (request.leaveType.deductsBalance) {
          await tx.leaveBalance.updateMany({
            where: balanceWhere,
            data: { pendingDays: { decrement: request.totalDays } },
          });
        }
        return;
      }

      if (isFinalStep) {
        await tx.leaveRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED", decidedAt: now },
        });
        if (request.leaveType.deductsBalance) {
          // Move the reservation into days actually taken.
          await tx.leaveBalance.updateMany({
            where: balanceWhere,
            data: {
              pendingDays: { decrement: request.totalDays },
              usedDays: { increment: request.totalDays },
            },
          });
        }
      }
    });

    const employee = await db.employee.findUnique({
      where: { id: request.employeeId },
      select: { user: { select: { id: true } } },
    });
    if (employee?.user) {
      await db.notification.create({
        data: {
          userId: employee.user.id,
          type: decision === "REJECTED" ? "leave.rejected" : isFinalStep ? "leave.approved" : "leave.progress",
          title: request.code,
          body: comment ?? "",
          link: `/leave/${requestId}`,
        },
      });
    }
    if (decision === "APPROVED" && !isFinalStep) {
      await db.notification.create({
        data: {
          userId: laterSteps[0].approverId, type: "leave.pending", title: request.code,
          body: request.reason.slice(0, 160), link: `/leave/${requestId}`,
        },
      });
    }

    await recordAudit({
      action: decision === "APPROVED" ? "APPROVE" : "REJECT",
      entityType: "LeaveRequest", entityId: requestId, userId: user.id,
      summary: `${request.code} step ${currentStep.step}`,
    });

    revalidateLeave(requestId);
    return ok(undefined);
  });
}

export async function cancelLeaveRequest(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorizeSession();
    const parsed = cancelRequestSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { requestId, cancelReason } = parsed.data;
    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true },
    });
    if (!request) return fail("notFound");

    const isOwner = request.employeeId === user.employeeId;
    if (!isOwner && !can(user, PERMISSIONS.LEAVE_MANAGE)) return fail("forbidden");
    if (request.status === "CANCELLED" || request.status === "REJECTED") return fail("alreadyClosed");

    const now = new Date();
    const wasApproved = request.status === "APPROVED";
    const wasPending = request.status === "PENDING";

    await db.$transaction(async (tx) => {
      await tx.leaveApproval.updateMany({
        where: { requestId, status: "PENDING" },
        data: { status: "SKIPPED", actedAt: now },
      });
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED", cancelledAt: now, cancelReason },
      });

      // Release whichever bucket the days are currently sitting in.
      if (request.leaveType.deductsBalance && (wasApproved || wasPending)) {
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getFullYear(),
          },
          data: wasApproved
            ? { usedDays: { decrement: request.totalDays } }
            : { pendingDays: { decrement: request.totalDays } },
        });
      }
    });

    await recordAudit({
      action: "UPDATE", entityType: "LeaveRequest", entityId: requestId, userId: user.id,
      summary: `${request.code} cancelled`,
    });

    revalidateLeave(requestId);
    return ok(undefined);
  });
}

export async function deleteLeaveRequest(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorizeSession();
    const request = await db.leaveRequest.findUnique({ where: { id }, select: { code: true, status: true, employeeId: true } });
    if (!request) return fail("notFound");
    if (request.status !== "DRAFT") return fail("onlyDrafts");
    if (request.employeeId !== user.employeeId && !can(user, PERMISSIONS.LEAVE_MANAGE)) return fail("forbidden");

    await db.leaveRequest.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "LeaveRequest", entityId: id, userId: user.id, summary: request.code,
    });

    revalidateLeave();
    return ok(undefined);
  });
}
