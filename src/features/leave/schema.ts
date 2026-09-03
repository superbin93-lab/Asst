import { z } from "zod";
import { optionalId, optionalString } from "@/features/assets/schema";

export const LEAVE_DAY_PARTS = ["FULL", "MORNING", "AFTERNOON"] as const;
export const REQUEST_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

const requiredDate = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "invalidDate" })
  .transform((v) => {
    const d = new Date(v);
    d.setHours(0, 0, 0, 0);
    return d;
  });

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const leaveRequestSchema = z.object({
  employeeId: optionalId,
  leaveTypeId: z.string().min(1, "required"),
  startDate: requiredDate,
  endDate: requiredDate,
  startDayPart: z.enum(LEAVE_DAY_PARTS).default("FULL"),
  endDayPart: z.enum(LEAVE_DAY_PARTS).default("FULL"),
  reason: z.string().trim().min(3, "minLength").max(2000, "maxLength"),
  contactPhone: optionalString,
  handoverToId: optionalId,
  handoverNote: optionalString,
  saveAsDraft: checkbox,
});

export const approvalDecisionSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: optionalString,
});

export const cancelRequestSchema = z.object({
  requestId: z.string().min(1),
  cancelReason: optionalString,
});

export const leaveTypeSchema = z.object({
  code: z.string().trim().min(2, "required").max(32, "maxLength").regex(/^[A-Z0-9_-]+$/, "codeFormat"),
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  nameEn: optionalString,
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "invalidNumber").default("#2563eb"),
  defaultDaysPerYear: z.coerce.number().min(0, "min").max(365, "max").default(0),
  isPaid: checkbox,
  allowHalfDay: checkbox,
  requiresAttachment: checkbox,
  deductsBalance: checkbox,
  carryOverLimitDays: z.coerce.number().min(0).max(365).default(0),
  carryOverExpiry: optionalString,
  maxConsecutiveDays: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : Number(v)))
    .optional()
    .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), { message: "positive" }),
  minNoticeDays: z.coerce.number().int().min(0).max(365).default(0),
  isActive: checkbox,
});

export const holidaySchema = z.object({
  date: requiredDate,
  name: z.string().trim().min(2, "minLength").max(160, "maxLength"),
  nameEn: optionalString,
  isRecurring: checkbox,
  isHalfDay: checkbox,
});

export const balanceAdjustmentSchema = z.object({
  balanceId: z.string().min(1),
  adjustmentDays: z.coerce.number().min(-365).max(365),
  note: optionalString,
});

export const generateBalancesSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});
