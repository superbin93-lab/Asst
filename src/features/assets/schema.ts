import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalId = optionalString.refine((v) => v === undefined || v.length > 0);

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), { message: "invalidDate" })
  .transform((v) => (v === undefined ? undefined : new Date(v)));

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v.replace(/[^\d.-]/g, ""))))
  .optional()
  .refine((v) => v === undefined || Number.isFinite(v), { message: "invalidNumber" });

const optionalInt = optionalNumber.refine(
  (v) => v === undefined || Number.isInteger(v),
  { message: "invalidNumber" },
);

export const ASSET_STATUSES = [
  "IN_STOCK", "ASSIGNED", "IN_REPAIR", "RESERVED", "RETIRED", "LOST", "DISPOSED",
] as const;
export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "BROKEN"] as const;
export const DEPRECIATION_METHODS = ["NONE", "STRAIGHT_LINE", "DECLINING_BALANCE"] as const;

export const assetInputSchema = z.object({
  assetTag: optionalString,
  name: z.string().trim().min(2, "minLength").max(200, "maxLength"),
  categoryId: z.string().min(1, "required"),
  status: z.enum(ASSET_STATUSES).default("IN_STOCK"),
  condition: z.enum(ASSET_CONDITIONS).default("NEW"),
  serialNumber: optionalString,
  model: optionalString,
  manufacturerId: optionalId,
  supplierId: optionalId,
  purchaseDate: optionalDate,
  purchaseCost: optionalNumber,
  currency: z.string().trim().default("VND"),
  invoiceNo: optionalString,
  poNumber: optionalString,
  warrantyMonths: optionalInt,
  warrantyEndAt: optionalDate,
  usefulLifeMonths: optionalInt,
  depreciationMethod: z.enum(DEPRECIATION_METHODS).default("STRAIGHT_LINE"),
  salvageValue: optionalNumber,
  locationId: optionalId,
  departmentId: optionalId,
  notes: optionalString,
  /** Free-form key/value pairs submitted as JSON from the specs editor. */
  specs: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      try {
        const parsed = JSON.parse(v);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, string>)
          : undefined;
      } catch {
        return undefined;
      }
    }),
});

export type AssetInput = z.infer<typeof assetInputSchema>;

export const assignAssetSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().min(1, "required"),
  assignedAt: optionalDate,
  expectedReturnAt: optionalDate,
  conditionOut: z.enum(ASSET_CONDITIONS).default("GOOD"),
  locationId: optionalId,
  note: optionalString,
});

export const returnAssetSchema = z.object({
  assignmentId: z.string().min(1),
  returnedAt: optionalDate,
  conditionIn: z.enum(ASSET_CONDITIONS).default("GOOD"),
  locationId: optionalId,
  /** Status to put the asset into after check-in. */
  nextStatus: z.enum(["IN_STOCK", "IN_REPAIR", "RETIRED", "LOST"]).default("IN_STOCK"),
  note: optionalString,
});

export const MAINTENANCE_TYPES = ["PREVENTIVE", "REPAIR", "UPGRADE", "INSPECTION", "CALIBRATION"] as const;
export const MAINTENANCE_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const maintenanceSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(MAINTENANCE_TYPES).default("REPAIR"),
  status: z.enum(MAINTENANCE_STATUSES).default("SCHEDULED"),
  title: z.string().trim().min(2, "minLength").max(200, "maxLength"),
  description: optionalString,
  vendorId: optionalId,
  cost: optionalNumber,
  scheduledAt: optionalDate,
  startedAt: optionalDate,
  completedAt: optionalDate,
  nextDueAt: optionalDate,
  performedBy: optionalString,
});

export const disposeAssetSchema = z.object({
  assetId: z.string().min(1),
  disposedAt: optionalDate,
  disposalNote: z.string().trim().min(2, "required"),
});

export { optionalDate, optionalNumber, optionalInt, optionalString, optionalId };
