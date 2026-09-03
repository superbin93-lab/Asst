"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize, authorizeSession } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { nextTicketCode } from "@/lib/sequence";
import { getSettings } from "@/lib/settings";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import type { SessionUser } from "@/lib/auth/session";
import { computeSlaTargets } from "./sla";
import { commentSchema, createTicketSchema, resolveTicketSchema, updateTicketSchema } from "./schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

function revalidateTicket(id?: string) {
  revalidatePath("/tickets");
  revalidatePath("/tickets/mine");
  if (id) revalidatePath(`/tickets/${id}`);
  revalidatePath("/");
}

/** Picks the SLA policy for a ticket: the category's policy, else by priority. */
async function resolveSlaPolicy(categoryId: string | undefined, priority: string) {
  if (categoryId) {
    const category = await db.ticketCategory.findUnique({
      where: { id: categoryId },
      include: { sla: true },
    });
    if (category?.sla) {
      const sameName = await db.slaPolicy.findFirst({
        where: { name: category.sla.name, priority: priority as never, isActive: true },
      });
      if (sameName) return sameName;
      return category.sla;
    }
  }
  return db.slaPolicy.findFirst({ where: { priority: priority as never, isActive: true } });
}

async function applySlaTargets(createdAt: Date, categoryId: string | undefined, priority: string) {
  const policy = await resolveSlaPolicy(categoryId, priority);
  if (!policy) return { responseDueAt: null, resolutionDueAt: null };

  const [settings, holidays] = await Promise.all([
    getSettings(),
    db.holiday.findMany({ select: { date: true, isHalfDay: true, isRecurring: true } }),
  ]);

  return computeSlaTargets(createdAt, policy, settings.workweek, holidays);
}

/** Visibility check used by every mutation on an existing ticket. */
async function assertTicketAccess(ticketId: string, user: SessionUser) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, code: true, status: true, requesterId: true, assigneeId: true, createdById: true, priority: true, categoryId: true },
  });
  if (!ticket) return null;

  if (can(user, PERMISSIONS.TICKET_VIEW_ALL)) return ticket;
  const isOwn =
    (user.employeeId && ticket.requesterId === user.employeeId) ||
    ticket.assigneeId === user.id ||
    ticket.createdById === user.id;
  return isOwn ? ticket : null;
}

export async function createTicket(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_CREATE);
    const parsed = createTicketSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;

    // Someone raising a ticket for themselves does not get to pick a requester.
    const requesterId = can(user, PERMISSIONS.TICKET_VIEW_ALL)
      ? (input.requesterId ?? user.employeeId ?? undefined)
      : (user.employeeId ?? undefined);

    const assigneeId = can(user, PERMISSIONS.TICKET_ASSIGN) ? input.assigneeId : undefined;

    const createdAt = new Date();
    const { responseDueAt, resolutionDueAt } = await applySlaTargets(createdAt, input.categoryId, input.priority);

    const requester = requesterId
      ? await db.employee.findUnique({ where: { id: requesterId }, select: { departmentId: true } })
      : null;

    const ticket = await db.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          code: await nextTicketCode(tx),
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          priority: input.priority,
          source: input.source,
          status: assigneeId ? "OPEN" : "NEW",
          requesterId,
          assigneeId,
          assetId: input.assetId,
          locationId: input.locationId,
          departmentId: requester?.departmentId,
          createdById: user.id,
          createdAt,
          responseDueAt,
          resolutionDueAt,
        },
      });

      await tx.ticketEvent.create({
        data: { ticketId: created.id, type: "created", message: created.code, actorId: user.id },
      });

      return created;
    });

    if (assigneeId && assigneeId !== user.id) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          type: "ticket.assigned",
          title: ticket.code,
          body: ticket.title,
          link: `/tickets/${ticket.id}`,
        },
      });
    }

    await recordAudit({
      action: "CREATE", entityType: "Ticket", entityId: ticket.id, userId: user.id,
      summary: `${ticket.code} - ${ticket.title}`,
    });

    revalidateTicket(ticket.id);
    return ok({ id: ticket.id });
  });
}

export async function updateTicket(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_UPDATE);
    const parsed = updateTicketSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const before = await assertTicketAccess(id, user);
    if (!before) return fail("notFound");

    const input = parsed.data;
    if (input.status === "CLOSED" && !input.resolution) {
      return fail("validation", { resolution: "required" });
    }

    // Re-derive SLA targets when the priority or category changed.
    const slaChanged = input.priority !== before.priority || input.categoryId !== before.categoryId;
    const sla = slaChanged
      ? await applySlaTargets(new Date(), input.categoryId, input.priority)
      : null;

    const now = new Date();
    const finished = input.status === "RESOLVED" || input.status === "CLOSED";

    const ticket = await db.ticket.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        priority: input.priority,
        status: input.status,
        assigneeId: can(user, PERMISSIONS.TICKET_ASSIGN) ? input.assigneeId : undefined,
        assetId: input.assetId,
        locationId: input.locationId,
        resolution: input.resolution,
        resolvedAt: finished ? (input.resolvedAt ?? now) : null,
        closedAt: input.status === "CLOSED" ? now : null,
        ...(sla ? { responseDueAt: sla.responseDueAt, resolutionDueAt: sla.resolutionDueAt } : {}),
      },
    });

    if (before.status !== ticket.status) {
      await db.ticketEvent.create({
        data: { ticketId: id, type: "status", message: `${before.status} -> ${ticket.status}`, actorId: user.id },
      });
    }
    if (before.priority !== ticket.priority) {
      await db.ticketEvent.create({
        data: { ticketId: id, type: "priority", message: `${before.priority} -> ${ticket.priority}`, actorId: user.id },
      });
    }
    if (before.assigneeId !== ticket.assigneeId) {
      await db.ticketEvent.create({
        data: { ticketId: id, type: "assigned", message: ticket.assigneeId ?? "", actorId: user.id },
      });
    }

    await recordAudit({
      action: "UPDATE", entityType: "Ticket", entityId: id, userId: user.id, summary: ticket.code,
    });

    revalidateTicket(id);
    return ok({ id });
  });
}

export async function addComment(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorizeSession();
    const parsed = commentSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { ticketId, body, isInternal } = parsed.data;
    const ticket = await assertTicketAccess(ticketId, user);
    if (!ticket) return fail("notFound");

    // Only agents may leave notes the requester cannot see.
    const internal = isInternal && can(user, PERMISSIONS.TICKET_UPDATE);

    const comment = await db.ticketComment.create({
      data: { ticketId, authorId: user.id, body, isInternal: internal },
    });

    // The first agent reply stops the response-SLA clock.
    if (!internal && can(user, PERMISSIONS.TICKET_UPDATE)) {
      await db.ticket.updateMany({
        where: { id: ticketId, firstResponseAt: null },
        data: { firstResponseAt: new Date(), status: ticket.status === "NEW" ? "OPEN" : undefined },
      });
    }

    revalidateTicket(ticketId);
    return ok({ id: comment.id });
  });
}

export async function assignTicket(id: string, assigneeId: string | null): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_ASSIGN);
    const ticket = await db.ticket.findUnique({ where: { id }, select: { code: true, title: true, status: true } });
    if (!ticket) return fail("notFound");

    await db.ticket.update({
      where: { id },
      data: { assigneeId, status: assigneeId && ticket.status === "NEW" ? "OPEN" : undefined },
    });
    await db.ticketEvent.create({
      data: { ticketId: id, type: assigneeId ? "assigned" : "unassigned", message: assigneeId ?? "", actorId: user.id },
    });

    if (assigneeId && assigneeId !== user.id) {
      await db.notification.create({
        data: {
          userId: assigneeId, type: "ticket.assigned", title: ticket.code, body: ticket.title,
          link: `/tickets/${id}`,
        },
      });
    }

    await recordAudit({ action: "ASSIGN", entityType: "Ticket", entityId: id, userId: user.id, summary: ticket.code });
    revalidateTicket(id);
    return ok(undefined);
  });
}

export async function claimTicket(id: string): Promise<ActionResult> {
  const user = await authorize(PERMISSIONS.TICKET_UPDATE);
  return assignTicket(id, user.id);
}

export async function resolveTicket(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_UPDATE);
    const parsed = resolveTicketSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { ticketId, resolution, close } = parsed.data;
    const ticket = await assertTicketAccess(ticketId, user);
    if (!ticket) return fail("notFound");

    const now = new Date();
    await db.ticket.update({
      where: { id: ticketId },
      data: {
        status: close ? "CLOSED" : "RESOLVED",
        resolution,
        resolvedAt: now,
        closedAt: close ? now : null,
        firstResponseAt: undefined,
      },
    });
    await db.ticketEvent.create({
      data: { ticketId, type: close ? "closed" : "resolved", message: resolution.slice(0, 200), actorId: user.id },
    });
    await recordAudit({
      action: "UPDATE", entityType: "Ticket", entityId: ticketId, userId: user.id,
      summary: `${ticket.code} ${close ? "closed" : "resolved"}`,
    });

    revalidateTicket(ticketId);
    return ok(undefined);
  });
}

export async function reopenTicket(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_UPDATE);
    const ticket = await assertTicketAccess(id, user);
    if (!ticket) return fail("notFound");

    await db.ticket.update({
      where: { id },
      data: {
        status: "OPEN",
        resolvedAt: null,
        closedAt: null,
        reopenedCount: { increment: 1 },
      },
    });
    await db.ticketEvent.create({ data: { ticketId: id, type: "reopened", message: "", actorId: user.id } });

    revalidateTicket(id);
    return ok(undefined);
  });
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.TICKET_DELETE);
    const ticket = await db.ticket.findUnique({ where: { id }, select: { code: true } });
    if (!ticket) return fail("notFound");

    await db.ticket.delete({ where: { id } });
    await recordAudit({ action: "DELETE", entityType: "Ticket", entityId: id, userId: user.id, summary: ticket.code });

    revalidateTicket();
    return ok(undefined);
  });
}
