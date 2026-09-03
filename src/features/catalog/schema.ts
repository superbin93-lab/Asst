import { z } from "zod";
import { optionalId, optionalNumber, optionalString } from "@/features/assets/schema";

const code = z
  .string()
  .trim()
  .min(2, "required")
  .max(32, "maxLength")
  .regex(/^[A-Z0-9_-]+$/, "codeFormat");

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

const optionalInt = optionalNumber.refine(
  (v) => v === undefined || Number.isInteger(v),
  { message: "invalidNumber" },
);

export const LOCATION_TYPES = ["OFFICE", "FLOOR", "ROOM", "WAREHOUSE", "DATACENTER", "REMOTE"] as const;
export const LICENSE_TYPES = ["PERPETUAL", "SUBSCRIPTION", "OEM", "VOLUME", "OPEN_SOURCE", "TRIAL"] as const;
export const STOCK_TXN_TYPES = ["IN", "OUT", "ADJUST"] as const;

export const assetCategorySchema = z.object({
  code,
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  nameEn: optionalString,
  parentId: optionalId,
  defaultUsefulLifeMonths: optionalInt,
  defaultWarrantyMonths: optionalInt,
  isActive: checkbox,
});

export const locationSchema = z.object({
  code,
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  type: z.enum(LOCATION_TYPES).default("OFFICE"),
  parentId: optionalId,
  address: optionalString,
  isActive: checkbox,
});

export const vendorSchema = z.object({
  code,
  name: z.string().trim().min(2, "minLength").max(160, "maxLength"),
  contactName: optionalString,
  email: optionalString.refine(
    (v) => v === undefined || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    { message: "invalidEmail" },
  ),
  phone: optionalString,
  address: optionalString,
  taxCode: optionalString,
  website: optionalString,
  isManufacturer: checkbox,
  isSupplier: checkbox,
  notes: optionalString,
  isActive: checkbox,
});

export const licenseSchema = z.object({
  name: z.string().trim().min(2, "minLength").max(160, "maxLength"),
  vendorId: optionalId,
  licenseKey: optionalString,
  type: z.enum(LICENSE_TYPES).default("SUBSCRIPTION"),
  seatsTotal: z.coerce.number().int().min(1, "positive").default(1),
  purchaseDate: optionalString.transform((v) => (v ? new Date(v) : undefined)),
  expiryDate: optionalString.transform((v) => (v ? new Date(v) : undefined)),
  cost: optionalNumber,
  currency: z.string().trim().default("VND"),
  notes: optionalString,
  isActive: checkbox,
});

export const licenseSeatSchema = z.object({
  licenseId: z.string().min(1),
  employeeId: optionalId,
  assetId: optionalId,
  note: optionalString,
});

export const consumableSchema = z.object({
  code: optionalString,
  name: z.string().trim().min(2, "minLength").max(160, "maxLength"),
  categoryId: optionalId,
  locationId: optionalId,
  unit: z.string().trim().min(1, "required").max(24, "maxLength").default("PCS"),
  minQuantity: z.coerce.number().int().min(0, "min").default(0),
  unitCost: optionalNumber,
  currency: z.string().trim().default("VND"),
  notes: optionalString,
  isActive: checkbox,
});

export const stockMovementSchema = z.object({
  consumableId: z.string().min(1),
  type: z.enum(STOCK_TXN_TYPES),
  quantity: z.coerce.number().int().refine((v) => v !== 0, { message: "positive" }),
  employeeId: optionalId,
  note: optionalString,
});
