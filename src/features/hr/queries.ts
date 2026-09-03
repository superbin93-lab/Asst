import "server-only";
import { db } from "@/lib/db";
import { contains, pagination, param, sorting, type SearchParamsInput } from "@/lib/query";
import type { Prisma } from "@/generated/prisma/client";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "./schema";

const SORTABLE = ["employeeCode", "fullName", "hireDate", "status", "createdAt"] as const;

export function buildEmployeeWhere(sp: SearchParamsInput): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  const q = param(sp, "q");
  if (q) {
    where.OR = [
      { fullName: contains(q) },
      { employeeCode: contains(q) },
      { email: contains(q) },
      { phone: contains(q) },
    ];
  }

  const status = param(sp, "status");
  if (status === "active") where.status = { not: "TERMINATED" };
  else if (status && (EMPLOYEE_STATUSES as readonly string[]).includes(status)) {
    where.status = status as never;
  } else if (!status) {
    // Leavers are hidden unless explicitly asked for.
    where.status = { not: "TERMINATED" };
  }

  const departmentId = param(sp, "department");
  if (departmentId) where.departmentId = departmentId;

  const positionId = param(sp, "position");
  if (positionId) where.positionId = positionId;

  const employmentType = param(sp, "type");
  if (employmentType && (EMPLOYMENT_TYPES as readonly string[]).includes(employmentType)) {
    where.employmentType = employmentType as never;
  }

  return where;
}

export async function listEmployees(sp: SearchParamsInput) {
  const where = buildEmployeeWhere(sp);
  const { page, perPage, skip, take } = pagination(sp);
  const sort = sorting(sp, SORTABLE, { field: "employeeCode", direction: "asc" });

  const [rows, total] = await Promise.all([
    db.employee.findMany({
      where,
      skip,
      take,
      orderBy: { [sort.field]: sort.direction },
      include: {
        department: { select: { id: true, name: true, nameEn: true } },
        position: { select: { id: true, title: true, titleEn: true } },
        manager: { select: { id: true, fullName: true } },
        _count: { select: { assetsHeld: true } },
      },
    }),
    db.employee.count({ where }),
  ]);

  return { rows, total, page, perPage };
}

export async function getEmployee(id: string) {
  return db.employee.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, nameEn: true } },
      position: { select: { id: true, title: true, titleEn: true } },
      manager: { select: { id: true, fullName: true, employeeCode: true } },
      location: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
      reports: {
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, employeeCode: true, avatarUrl: true },
      },
      contracts: { orderBy: { startDate: "desc" } },
      assetsHeld: {
        orderBy: { assetTag: "asc" },
        select: {
          id: true, assetTag: true, name: true, status: true, condition: true,
          category: { select: { name: true, nameEn: true } },
        },
      },
      leaveBalances: {
        where: { year: new Date().getFullYear() },
        include: { leaveType: { select: { id: true, name: true, nameEn: true, color: true } } },
        orderBy: { leaveType: { code: "asc" } },
      },
      leaveRequests: {
        orderBy: { startDate: "desc" },
        take: 10,
        include: { leaveType: { select: { name: true, nameEn: true, color: true } } },
      },
      requestedTickets: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, code: true, title: true, status: true, priority: true, createdAt: true },
      },
    },
  });
}

export async function getEmployeeFormOptions(excludeId?: string) {
  const [departments, positions, locations, managers] = await Promise.all([
    db.department.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, name: true, nameEn: true, code: true },
    }),
    db.position.findMany({
      where: { isActive: true },
      orderBy: { level: "desc" },
      select: { id: true, title: true, titleEn: true, code: true },
    }),
    db.location.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.employee.findMany({
      where: { status: { not: "TERMINATED" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);

  return { departments, positions, locations, managers };
}

export async function listDepartments() {
  return db.department.findMany({
    orderBy: { code: "asc" },
    include: {
      parent: { select: { id: true, name: true } },
      manager: { select: { id: true, fullName: true } },
      _count: { select: { employees: true, assets: true } },
    },
  });
}

export async function listPositions() {
  return db.position.findMany({
    orderBy: [{ level: "desc" }, { code: "asc" }],
    include: { _count: { select: { employees: true } } },
  });
}

export async function listContracts(sp: SearchParamsInput) {
  const { page, perPage, skip, take } = pagination(sp);
  const q = param(sp, "q");
  const status = param(sp, "status");
  const expiring = param(sp, "expiring") === "1";

  const where: Prisma.EmploymentContractWhereInput = {
    ...(q
      ? { OR: [{ contractNo: contains(q) }, { employee: { fullName: contains(q) } }] }
      : {}),
    ...(status ? { status: status as never } : {}),
    ...(expiring
      ? { endDate: { gte: new Date(), lte: new Date(Date.now() + 60 * 86_400_000) }, status: "ACTIVE" }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.employmentContract.findMany({
      where,
      skip,
      take,
      orderBy: { startDate: "desc" },
      include: {
        employee: {
          select: {
            id: true, fullName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    db.employmentContract.count({ where }),
  ]);

  return { rows, total, page, perPage };
}

export async function getHrStats() {
  const [headcount, probation, byType, newThisMonth] = await Promise.all([
    db.employee.count({ where: { status: { in: ["ACTIVE", "PROBATION", "ON_LEAVE"] } } }),
    db.employee.count({ where: { status: "PROBATION" } }),
    db.employee.groupBy({
      by: ["employmentType"],
      where: { status: { not: "TERMINATED" } },
      _count: { _all: true },
    }),
    db.employee.count({
      where: { hireDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    }),
  ]);

  return {
    headcount,
    probation,
    newThisMonth,
    byType: Object.fromEntries(byType.map((row) => [row.employmentType, row._count._all])),
  };
}
