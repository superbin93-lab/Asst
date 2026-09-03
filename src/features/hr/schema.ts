import { z } from "zod";
import { optionalDate, optionalId, optionalNumber, optionalString } from "@/features/assets/schema";

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "OUTSOURCED"] as const;
export const EMPLOYEE_STATUSES = ["PROBATION", "ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"] as const;
export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export const CONTRACT_TYPES = ["PROBATION", "FIXED_TERM", "INDEFINITE", "SEASONAL", "SERVICE"] as const;
export const CONTRACT_STATUSES = ["DRAFT", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED"] as const;

const requiredDate = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "invalidDate" })
  .transform((v) => new Date(v));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const employeeSchema = z.object({
  employeeCode: optionalString,
  fullName: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  email: z.string().trim().toLowerCase().email("invalidEmail"),
  personalEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), { message: "invalidEmail" }),
  phone: optionalString,
  dateOfBirth: optionalDate,
  gender: z
    .string()
    .optional()
    .transform((v) => (v && (GENDERS as readonly string[]).includes(v) ? (v as (typeof GENDERS)[number]) : undefined)),
  nationalId: optionalString,
  taxCode: optionalString,
  socialInsuranceNo: optionalString,
  address: optionalString,
  emergencyContact: optionalString,
  emergencyPhone: optionalString,
  departmentId: optionalId,
  positionId: optionalId,
  managerId: optionalId,
  locationId: optionalId,
  employmentType: z.enum(EMPLOYMENT_TYPES).default("FULL_TIME"),
  status: z.enum(EMPLOYEE_STATUSES).default("PROBATION"),
  hireDate: requiredDate,
  probationEndDate: optionalDate,
  terminationDate: optionalDate,
  terminationReason: optionalString,
  notes: optionalString,
});

export const departmentSchema = z.object({
  code: z.string().trim().min(2, "required").max(32, "maxLength").regex(/^[A-Z0-9_-]+$/, "codeFormat"),
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  nameEn: optionalString,
  description: optionalString,
  parentId: optionalId,
  managerId: optionalId,
  isActive: checkbox,
});

export const positionSchema = z.object({
  code: z.string().trim().min(2, "required").max(32, "maxLength").regex(/^[A-Z0-9_-]+$/, "codeFormat"),
  title: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  titleEn: optionalString,
  level: z.coerce.number().int().min(1, "min").max(20, "max").default(1),
  isActive: checkbox,
});

export const contractSchema = z.object({
  employeeId: z.string().min(1, "required"),
  contractNo: z.string().trim().min(2, "required").max(64, "maxLength"),
  type: z.enum(CONTRACT_TYPES).default("FIXED_TERM"),
  status: z.enum(CONTRACT_STATUSES).default("ACTIVE"),
  startDate: requiredDate,
  endDate: optionalDate,
  baseSalary: optionalNumber,
  currency: z.string().trim().default("VND"),
  signedAt: optionalDate,
  notes: optionalString,
});
