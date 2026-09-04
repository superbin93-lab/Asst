import "server-only";
import { db } from "@/lib/db";
import { contains, pagination, param, sorting, type SearchParamsInput } from "@/lib/query";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { REQUEST_STATUSES } from "./schema";

const SORTABLE = ["code", "startDate", "totalDays", "status", "submittedAt", "createdAt"] as const;

export type LeaveScope = "mine" | "all" | "approvals";

export function buildLeaveWhere(
  sp: SearchParamsInput,
  user: SessionUser,
  scope: LeaveScope,
): Prisma.LeaveRequestWhereInput {
  const conditions: Prisma.LeaveRequestWhereInput[] = [];

  if (scope === "mine") {
    conditions.push({ employeeId: user.employeeId ?? "__none__" });
  } else if (scope === "approvals") {
    // Anything still waiting on this user, plus anything HR can act on.
    conditions.push({
      status: "PENDING",
      approvals: {
        some: {
          status: "PENDING",
          ...(can(user, PERMISSIONS.LEAVE_MANAGE) ? {} : { approverId: user.id }),
        },
      },
    });
  } else if (!can(user, PERMISSIONS.LEAVE_VIEW_ALL)) {
    conditions.push({ employeeId: user.employeeId ?? "__none__" });
  }

  const q = param(sp, "q");
  if (q) {
    conditions.push({
      OR: [{ code: contains(q) }, { reason: contains(q) }, { employee: { fullName: contains(q) } }],
    });
  }

  const status = param(sp, "status");
  if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) {
    conditions.push({ status: status as never });
  }

  const typeId = param(sp, "type");
  if (typeId) conditions.push({ leaveTypeId: typeId });

  const departmentId = param(sp, "department");
  if (departmentId) conditions.push({ employee: { departmentId } });

  const year = param(sp, "year");
  if (year && /^\d{4}$/.test(year)) {
    conditions.push({
      startDate: { gte: new Date(`${year}-01-01T00:00:00.000Z`), lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`) },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export async function listLeaveRequests(sp: SearchParamsInput, user: SessionUser, scope: LeaveScope) {
  const where = buildLeaveWhere(sp, user, scope);
  const { page, perPage, skip, take } = pagination(sp);
  const sort = sorting(sp, SORTABLE, { field: "startDate", direction: "desc" });

  const [rows, total] = await Promise.all([
    db.leaveRequest.findMany({
      where,
      skip,
      take,
      orderBy: { [sort.field]: sort.direction },
      include: {
        employee: {
          select: {
            id: true, fullName: true, employeeCode: true, avatarUrl: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { id: true, name: true, nameEn: true, color: true } },
        approvals: {
          orderBy: { step: "asc" },
          select: { id: true, step: true, status: true, approverId: true },
        },
      },
    }),
    db.leaveRequest.count({ where }),
  ]);

  return { rows, total, page, perPage };
}

export async function getLeaveRequest(id: string) {
  return db.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true, fullName: true, employeeCode: true, email: true, avatarUrl: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
      leaveType: true,
      handoverTo: { select: { id: true, fullName: true, employeeCode: true } },
      approvals: {
        orderBy: { step: "asc" },
        include: { approver: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
}

export async function getLeaveBalances(employeeId: string, year: number) {
  return db.leaveBalance.findMany({
    where: { employeeId, year },
    orderBy: { leaveType: { code: "asc" } },
    include: { leaveType: { select: { id: true, code: true, name: true, nameEn: true, color: true, isPaid: true } } },
  });
}

/** Balance overview across the company, used by the HR balances screen. */
export async function listBalances(sp: SearchParamsInput) {
  const year = Number(param(sp, "year") ?? new Date().getFullYear());
  const q = param(sp, "q");
  const departmentId = param(sp, "department");
  const { page, perPage, skip, take } = pagination(sp);

  const where: Prisma.EmployeeWhereInput = {
    status: { not: "TERMINATED" },
    ...(q ? { OR: [{ fullName: contains(q) }, { employeeCode: contains(q) }] } : {}),
    ...(departmentId ? { departmentId } : {}),
  };

  const [employees, total] = await Promise.all([
    db.employee.findMany({
      where,
      skip,
      take,
      orderBy: { employeeCode: "asc" },
      select: {
        id: true, fullName: true, employeeCode: true,
        department: { select: { name: true } },
        leaveBalances: {
          where: { year },
          include: { leaveType: { select: { id: true, code: true, name: true, nameEn: true } } },
          orderBy: { leaveType: { code: "asc" } },
        },
      },
    }),
    db.employee.count({ where }),
  ]);

  return { employees, total, page, perPage, year };
}

export async function getLeaveFormOptions(user: SessionUser) {
  const canPickEmployee = can(user, PERMISSIONS.LEAVE_VIEW_ALL) || can(user, PERMISSIONS.LEAVE_MANAGE);

  const [types, employees, departments] = await Promise.all([
    db.leaveType.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameEn: true },
    }),
  ]);

  return { types, employees, departments, canPickEmployee };
}

export async function getHolidays(year?: number) {
  if (!year) return db.holiday.findMany({ orderBy: { date: "asc" } });
  return db.holiday.findMany({
    where: {
      OR: [
        { isRecurring: true },
        {
          date: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        },
      ],
    },
    orderBy: { date: "asc" },
  });
}
