import "server-only";
import { db } from "@/lib/db";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

/**
 * One round-trip per widget the signed-in user is actually allowed to see, so a
 * plain employee's dashboard costs a fraction of an administrator's.
 */
export async function getDashboardData(user: SessionUser) {
  const settings = await getSettings();
  const now = new Date();
  const warrantyCutoff = new Date(now.getTime() + settings.warrantyAlertDays * 86_400_000);
  const licenseCutoff = new Date(now.getTime() + settings.licenseAlertDays * 86_400_000);

  const seesAssets = can(user, PERMISSIONS.ASSET_VIEW);
  const seesAllTickets = can(user, PERMISSIONS.TICKET_VIEW_ALL);
  const seesEmployees = can(user, PERMISSIONS.EMPLOYEE_VIEW);
  const approvesLeave = can(user, PERMISSIONS.LEAVE_APPROVE);
  const seesConsumables = can(user, PERMISSIONS.CONSUMABLE_VIEW);
  const seesLicenses = can(user, PERMISSIONS.LICENSE_VIEW);

  const ticketVisibility = seesAllTickets
    ? {}
    : {
        OR: [
          ...(user.employeeId ? [{ requesterId: user.employeeId }] : []),
          { assigneeId: user.id },
          { createdById: user.id },
        ],
      };

  const [
    assetTotals,
    assetsByCategory,
    warrantyExpiring,
    openTickets,
    breachedTickets,
    myOpenTickets,
    recentTickets,
    pendingApprovals,
    headcount,
    upcomingLeave,
    myBalances,
    lowStock,
    expiringLicenses,
    recentAssignments,
  ] = await Promise.all([
    seesAssets ? db.asset.groupBy({ by: ["status"], _count: { _all: true } }) : Promise.resolve([]),
    seesAssets
      ? db.asset.groupBy({ by: ["categoryId"], _count: { _all: true }, orderBy: { _count: { categoryId: "desc" } } })
      : Promise.resolve([]),
    seesAssets
      ? db.asset.count({ where: { warrantyEndAt: { gte: now, lte: warrantyCutoff } } })
      : Promise.resolve(0),

    db.ticket.count({
      where: { ...ticketVisibility, status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    }),
    seesAllTickets
      ? db.ticket.count({
          where: {
            status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
            resolutionDueAt: { lt: now },
          },
        })
      : Promise.resolve(0),
    db.ticket.count({
      where: { assigneeId: user.id, status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    }),
    db.ticket.findMany({
      where: ticketVisibility,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, code: true, title: true, status: true, priority: true, createdAt: true,
        requester: { select: { fullName: true } },
      },
    }),

    approvesLeave
      ? db.leaveRequest.count({
          where: {
            status: "PENDING",
            approvals: {
              some: {
                status: "PENDING",
                ...(can(user, PERMISSIONS.LEAVE_MANAGE) ? {} : { approverId: user.id }),
              },
            },
          },
        })
      : Promise.resolve(0),

    seesEmployees
      ? db.employee.count({ where: { status: { in: ["ACTIVE", "PROBATION", "ON_LEAVE"] } } })
      : Promise.resolve(0),

    db.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        endDate: { gte: now },
        startDate: { lte: new Date(now.getTime() + 30 * 86_400_000) },
        ...(can(user, PERMISSIONS.LEAVE_VIEW_ALL)
          ? {}
          : user.departmentId
            ? { employee: { departmentId: user.departmentId } }
            : { employeeId: user.employeeId ?? "__none__" }),
      },
      orderBy: { startDate: "asc" },
      take: 6,
      select: {
        id: true, startDate: true, endDate: true, totalDays: true,
        employee: { select: { id: true, fullName: true, avatarUrl: true } },
        leaveType: { select: { name: true, nameEn: true, color: true } },
      },
    }),

    user.employeeId
      ? db.leaveBalance.findMany({
          where: { employeeId: user.employeeId, year: now.getFullYear() },
          include: { leaveType: { select: { name: true, nameEn: true, color: true } } },
          orderBy: { leaveType: { code: "asc" } },
        })
      : Promise.resolve([]),

    seesConsumables
      ? db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "Consumable" WHERE "quantity" <= "minQuantity" AND "isActive" = true`
      : Promise.resolve([]),

    seesLicenses
      ? db.softwareLicense.count({ where: { expiryDate: { gte: now, lte: licenseCutoff } } })
      : Promise.resolve(0),

    seesAssets
      ? db.assetAssignment.findMany({
          orderBy: { assignedAt: "desc" },
          take: 6,
          select: {
            id: true, assignedAt: true, status: true,
            asset: { select: { id: true, assetTag: true, name: true } },
            employee: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const categoryIds = assetsByCategory.map((row) => row.categoryId);
  const categories = categoryIds.length
    ? await db.assetCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, nameEn: true },
      })
    : [];
  const categoryName = new Map(categories.map((c) => [c.id, c]));

  const statusCounts = Object.fromEntries(assetTotals.map((row) => [row.status, row._count._all]));

  return {
    permissions: { seesAssets, seesAllTickets, seesEmployees, approvesLeave, seesConsumables, seesLicenses },
    assets: {
      total: assetTotals.reduce((sum, row) => sum + row._count._all, 0),
      inStock: statusCounts.IN_STOCK ?? 0,
      assigned: statusCounts.ASSIGNED ?? 0,
      inRepair: statusCounts.IN_REPAIR ?? 0,
      warrantyExpiring,
      byStatus: assetTotals.map((row) => ({ key: row.status, value: row._count._all })),
      byCategory: assetsByCategory.map((row) => ({
        key: row.categoryId,
        name: categoryName.get(row.categoryId)?.name ?? "-",
        nameEn: categoryName.get(row.categoryId)?.nameEn ?? null,
        value: row._count._all,
      })),
    },
    tickets: { open: openTickets, breached: breachedTickets, mine: myOpenTickets, recent: recentTickets },
    leave: { pendingApprovals, upcoming: upcomingLeave, myBalances },
    hr: { headcount },
    inventory: { lowStock: Number(lowStock[0]?.count ?? 0), expiringLicenses },
    assignments: recentAssignments,
  };
}
