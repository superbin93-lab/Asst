import "server-only";
import { db } from "@/lib/db";
import { contains, pagination, param, sorting, type SearchParamsInput } from "@/lib/query";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { CLOSED_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES } from "./schema";

const SORTABLE = ["code", "title", "status", "priority", "createdAt", "resolutionDueAt"] as const;

export type TicketScope = "all" | "mine" | "assigned";

/**
 * Builds the ticket filter. `scope` decides visibility: users without
 * `ticket.view.all` only ever see tickets they raised or are assigned.
 */
export function buildTicketWhere(
  sp: SearchParamsInput,
  user: SessionUser,
  scope: TicketScope,
): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};
  const conditions: Prisma.TicketWhereInput[] = [];

  const effectiveScope = can(user, PERMISSIONS.TICKET_VIEW_ALL) ? scope : "mine";

  if (effectiveScope === "mine") {
    conditions.push({
      OR: [
        ...(user.employeeId ? [{ requesterId: user.employeeId }] : []),
        { assigneeId: user.id },
        { createdById: user.id },
      ],
    });
  } else if (effectiveScope === "assigned") {
    conditions.push({ assigneeId: user.id });
  }

  const q = param(sp, "q");
  if (q) {
    conditions.push({
      OR: [{ code: contains(q) }, { title: contains(q) }, { description: contains(q) }],
    });
  }

  const status = param(sp, "status");
  if (status === "open") {
    conditions.push({ status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } });
  } else if (status && (TICKET_STATUSES as readonly string[]).includes(status)) {
    conditions.push({ status: status as never });
  }

  const priority = param(sp, "priority");
  if (priority && (TICKET_PRIORITIES as readonly string[]).includes(priority)) {
    conditions.push({ priority: priority as never });
  }

  const categoryId = param(sp, "category");
  if (categoryId) conditions.push({ categoryId });

  const assignee = param(sp, "assignee");
  if (assignee === "none") conditions.push({ assigneeId: null });
  else if (assignee === "me") conditions.push({ assigneeId: user.id });
  else if (assignee) conditions.push({ assigneeId: assignee });

  if (param(sp, "sla") === "breached") {
    conditions.push({
      status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      resolutionDueAt: { lt: new Date() },
    });
  }

  if (conditions.length > 0) where.AND = conditions;
  return where;
}

export async function listTickets(sp: SearchParamsInput, user: SessionUser, scope: TicketScope) {
  const where = buildTicketWhere(sp, user, scope);
  const { page, perPage, skip, take } = pagination(sp);
  const sort = sorting(sp, SORTABLE, { field: "createdAt", direction: "desc" });

  const [rows, total] = await Promise.all([
    db.ticket.findMany({
      where,
      skip,
      take,
      orderBy: { [sort.field]: sort.direction },
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        requester: { select: { id: true, fullName: true, employeeCode: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    db.ticket.count({ where }),
  ]);

  return { rows, total, page, perPage };
}

export async function getTicket(id: string) {
  return db.ticket.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, nameEn: true } },
      requester: {
        select: {
          id: true, fullName: true, employeeCode: true, email: true, phone: true, avatarUrl: true,
          department: { select: { name: true } },
        },
      },
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      asset: { select: { id: true, assetTag: true, name: true } },
      location: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { actor: { select: { name: true } } },
      },
    },
  });
}

/** Reference data for the ticket form and filters. */
export async function getTicketFormOptions() {
  const [categories, employees, agents, assets, locations] = await Promise.all([
    db.ticketCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameEn: true, slaPolicyId: true },
    }),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        OR: [
          { isSuperAdmin: true },
          { roles: { some: { role: { permissions: { some: { permission: PERMISSIONS.TICKET_UPDATE } } } } } },
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.asset.findMany({
      where: { status: { notIn: ["DISPOSED", "RETIRED"] } },
      orderBy: { assetTag: "asc" },
      select: { id: true, assetTag: true, name: true },
      take: 500,
    }),
    db.location.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return { categories, employees, agents, assets, locations };
}

export async function getTicketStats(user: SessionUser) {
  const visibility = can(user, PERMISSIONS.TICKET_VIEW_ALL)
    ? {}
    : {
        OR: [
          ...(user.employeeId ? [{ requesterId: user.employeeId }] : []),
          { assigneeId: user.id },
          { createdById: user.id },
        ],
      };

  const openFilter = { ...visibility, status: { notIn: CLOSED_STATUSES as string[] } } as Prisma.TicketWhereInput;

  const [open, unassigned, breached, mine] = await Promise.all([
    db.ticket.count({ where: openFilter }),
    db.ticket.count({ where: { ...openFilter, assigneeId: null } }),
    db.ticket.count({ where: { ...openFilter, resolutionDueAt: { lt: new Date() } } }),
    db.ticket.count({ where: { ...openFilter, assigneeId: user.id } }),
  ]);

  return { open, unassigned, breached, mine };
}
