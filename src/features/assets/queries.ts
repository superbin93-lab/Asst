import "server-only";
import { db } from "@/lib/db";
import { contains, pagination, param, sorting, type SearchParamsInput } from "@/lib/query";
import type { Prisma } from "@/generated/prisma/client";
import { ASSET_STATUSES } from "./schema";

const SORTABLE = ["assetTag", "name", "status", "purchaseDate", "warrantyEndAt", "createdAt"] as const;

export function buildAssetWhere(sp: SearchParamsInput): Prisma.AssetWhereInput {
  const q = param(sp, "q");
  const status = param(sp, "status");
  const categoryId = param(sp, "category");
  const locationId = param(sp, "location");
  const departmentId = param(sp, "department");
  const holderId = param(sp, "holder");
  const warranty = param(sp, "warranty");

  const where: Prisma.AssetWhereInput = {};

  if (q) {
    where.OR = [
      { assetTag: contains(q) },
      { name: contains(q) },
      { serialNumber: contains(q) },
      { model: contains(q) },
      { holder: { fullName: contains(q) } },
    ];
  }
  if (status && (ASSET_STATUSES as readonly string[]).includes(status)) {
    where.status = status as Prisma.EnumAssetStatusFilter["equals"];
  }
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.locationId = locationId;
  if (departmentId) where.departmentId = departmentId;
  if (holderId) where.holderId = holderId;

  if (warranty === "expiring") {
    const in30 = new Date(Date.now() + 30 * 86_400_000);
    where.warrantyEndAt = { gte: new Date(), lte: in30 };
  } else if (warranty === "expired") {
    where.warrantyEndAt = { lt: new Date() };
  }

  return where;
}

export async function listAssets(sp: SearchParamsInput) {
  const where = buildAssetWhere(sp);
  const { page, perPage, skip, take } = pagination(sp);
  const sort = sorting(sp, SORTABLE, { field: "createdAt", direction: "desc" });

  const [rows, total] = await Promise.all([
    db.asset.findMany({
      where,
      skip,
      take,
      orderBy: { [sort.field]: sort.direction },
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        location: { select: { id: true, name: true } },
        holder: { select: { id: true, fullName: true, employeeCode: true } },
        department: { select: { id: true, name: true } },
      },
    }),
    db.asset.count({ where }),
  ]);

  return { rows, total, page, perPage };
}

export async function getAsset(id: string) {
  return db.asset.findUnique({
    where: { id },
    include: {
      category: true,
      manufacturer: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      holder: {
        select: {
          id: true, fullName: true, employeeCode: true, email: true, avatarUrl: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          issuedBy: { select: { name: true } },
          receivedBy: { select: { name: true } },
        },
      },
      maintenances: {
        orderBy: { createdAt: "desc" },
        include: { vendor: { select: { id: true, name: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { actor: { select: { name: true } } },
      },
      licenseSeats: {
        where: { revokedAt: null },
        include: { license: { select: { id: true, name: true } } },
      },
    },
  });
}

/** Lookup data shared by the asset form and the list filters. */
export async function getAssetFormOptions() {
  const [categories, locations, vendors, departments, employees] = await Promise.all([
    db.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nameEn: true, defaultUsefulLifeMonths: true, defaultWarrantyMonths: true } }),
    db.location.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true } }),
    db.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, isManufacturer: true, isSupplier: true } }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nameEn: true } }),
    db.employee.findMany({
      where: { status: { notIn: ["TERMINATED"] } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true, departmentId: true },
    }),
  ]);

  return { categories, locations, vendors, departments, employees };
}

export async function getAssetStats() {
  const [byStatus, total, warrantyExpiring] = await Promise.all([
    db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    db.asset.count(),
    db.asset.count({
      where: { warrantyEndAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 86_400_000) } },
    }),
  ]);

  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
  return {
    total,
    inStock: counts.IN_STOCK ?? 0,
    assigned: counts.ASSIGNED ?? 0,
    inRepair: counts.IN_REPAIR ?? 0,
    warrantyExpiring,
  };
}
