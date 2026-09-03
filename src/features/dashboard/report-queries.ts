import "server-only";
import { db } from "@/lib/db";

export type ReportRange = { from: Date; to: Date; label: string };

/** Resolves the `?period=` query into a concrete date range. */
export function resolveRange(period: string | undefined): ReportRange {
  const now = new Date();
  const year = now.getFullYear();

  if (period === "month") {
    return { from: new Date(year, now.getMonth(), 1), to: now, label: "thisMonth" };
  }
  if (period === "quarter") {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    return { from: new Date(year, quarterStart, 1), to: now, label: "thisQuarter" };
  }
  return { from: new Date(year, 0, 1), to: now, label: "thisYear" };
}

const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export async function getReportData(range: ReportRange) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    assetsByCategory,
    assetsByStatus,
    assetsByDepartment,
    assetValue,
    acquired,
    disposed,
    maintenanceCost,
    ticketsCreated,
    ticketsByCategory,
    ticketsByPriority,
    ticketsByAssignee,
    resolvedTickets,
    leaveByType,
    headcountByDepartment,
    newHires,
    leavers,
  ] = await Promise.all([
    db.asset.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    db.asset.groupBy({ by: ["departmentId"], _count: { _all: true } }),
    db.asset.aggregate({ _sum: { purchaseCost: true } }),
    db.asset.count({ where: { purchaseDate: { gte: range.from, lte: range.to } } }),
    db.asset.count({ where: { disposedAt: { gte: range.from, lte: range.to } } }),
    db.assetMaintenance.aggregate({
      _sum: { cost: true },
      where: { completedAt: { gte: range.from, lte: range.to } },
    }),

    db.ticket.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    }),
    db.ticket.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
      where: { createdAt: { gte: range.from, lte: range.to } },
    }),
    db.ticket.groupBy({
      by: ["priority"],
      _count: { _all: true },
      where: { createdAt: { gte: range.from, lte: range.to } },
    }),
    db.ticket.groupBy({
      by: ["assigneeId"],
      _count: { _all: true },
      where: { createdAt: { gte: range.from, lte: range.to }, assigneeId: { not: null } },
    }),
    db.ticket.findMany({
      where: { resolvedAt: { gte: range.from, lte: range.to } },
      select: { createdAt: true, firstResponseAt: true, resolvedAt: true, resolutionDueAt: true },
    }),

    db.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      _sum: { totalDays: true },
      where: { status: "APPROVED", startDate: { gte: range.from, lte: range.to } },
    }),

    db.employee.groupBy({
      by: ["departmentId"],
      _count: { _all: true },
      where: { status: { not: "TERMINATED" } },
    }),
    db.employee.count({ where: { hireDate: { gte: range.from, lte: range.to } } }),
    db.employee.count({ where: { terminationDate: { gte: range.from, lte: range.to } } }),
  ]);

  const [categories, departments, leaveTypes, agents] = await Promise.all([
    db.assetCategory.findMany({ select: { id: true, name: true, nameEn: true } }),
    db.department.findMany({ select: { id: true, name: true, nameEn: true } }),
    db.leaveType.findMany({ select: { id: true, name: true, nameEn: true, color: true } }),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);

  const nameOf = <T extends { id: string; name: string; nameEn?: string | null }>(
    rows: T[],
    id: string | null,
  ) => rows.find((r) => r.id === id) ?? null;

  // Twelve-month ticket volume, zero-filled so the trend line has no gaps.
  const buckets = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    buckets.set(`${d.getFullYear()}-${MONTH_KEYS[d.getMonth()]}`, 0);
  }
  for (const ticket of ticketsCreated) {
    const key = `${ticket.createdAt.getFullYear()}-${MONTH_KEYS[ticket.createdAt.getMonth()]}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const responseMinutes = resolvedTickets
    .filter((t) => t.firstResponseAt)
    .map((t) => (t.firstResponseAt!.getTime() - t.createdAt.getTime()) / 60_000);
  const resolutionMinutes = resolvedTickets
    .filter((t) => t.resolvedAt)
    .map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60_000);
  const withinSla = resolvedTickets.filter(
    (t) => t.resolutionDueAt && t.resolvedAt && t.resolvedAt <= t.resolutionDueAt,
  ).length;

  const average = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    assets: {
      byCategory: assetsByCategory.map((row) => ({
        key: row.categoryId,
        entity: nameOf(categories, row.categoryId),
        value: row._count._all,
      })),
      byStatus: assetsByStatus.map((row) => ({ key: row.status, value: row._count._all })),
      byDepartment: assetsByDepartment.map((row) => ({
        key: row.departmentId ?? "none",
        entity: nameOf(departments, row.departmentId),
        value: row._count._all,
      })),
      totalValue: assetValue._sum.purchaseCost?.toString() ?? "0",
      acquired,
      disposed,
      maintenanceCost: maintenanceCost._sum.cost?.toString() ?? "0",
    },
    tickets: {
      trend: Array.from(buckets.entries()).map(([key, value]) => ({
        label: key.slice(5) + "/" + key.slice(2, 4),
        value,
      })),
      byCategory: ticketsByCategory.map((row) => ({
        key: row.categoryId ?? "none",
        value: row._count._all,
      })),
      byPriority: ticketsByPriority.map((row) => ({ key: row.priority, value: row._count._all })),
      byAssignee: ticketsByAssignee.map((row) => ({
        key: row.assigneeId ?? "none",
        entity: nameOf(agents, row.assigneeId),
        value: row._count._all,
      })),
      avgResponseMinutes: Math.round(average(responseMinutes)),
      avgResolutionMinutes: Math.round(average(resolutionMinutes)),
      slaCompliance: resolvedTickets.length === 0 ? 0 : (withinSla / resolvedTickets.length) * 100,
      resolvedCount: resolvedTickets.length,
    },
    leave: {
      byType: leaveByType.map((row) => ({
        key: row.leaveTypeId,
        entity: nameOf(leaveTypes, row.leaveTypeId),
        color: leaveTypes.find((x) => x.id === row.leaveTypeId)?.color,
        value: row._sum.totalDays ?? 0,
      })),
    },
    hr: {
      byDepartment: headcountByDepartment.map((row) => ({
        key: row.departmentId ?? "none",
        entity: nameOf(departments, row.departmentId),
        value: row._count._all,
      })),
      newHires,
      leavers,
    },
    ticketCategories: await db.ticketCategory.findMany({ select: { id: true, name: true, nameEn: true } }),
  };
}
