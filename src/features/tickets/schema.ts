import { z } from "zod";
import { optionalDate, optionalId, optionalString } from "@/features/assets/schema";

export const TICKET_STATUSES = [
  "NEW", "OPEN", "PENDING_REQUESTER", "ON_HOLD", "RESOLVED", "CLOSED", "CANCELLED",
] as const;
export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TICKET_SOURCES = ["WEB", "EMAIL", "PHONE", "CHAT", "WALK_IN"] as const;

/** Statuses a ticket is considered finished in. */
export const CLOSED_STATUSES: readonly string[] = ["RESOLVED", "CLOSED", "CANCELLED"];

export const createTicketSchema = z.object({
  title: z.string().trim().min(4, "minLength").max(200, "maxLength"),
  description: z.string().trim().min(4, "minLength"),
  categoryId: optionalId,
  priority: z.enum(TICKET_PRIORITIES).default("MEDIUM"),
  source: z.enum(TICKET_SOURCES).default("WEB"),
  requesterId: optionalId,
  assigneeId: optionalId,
  assetId: optionalId,
  locationId: optionalId,
});

export const updateTicketSchema = z.object({
  title: z.string().trim().min(4, "minLength").max(200, "maxLength"),
  description: z.string().trim().min(4, "minLength"),
  categoryId: optionalId,
  priority: z.enum(TICKET_PRIORITIES),
  status: z.enum(TICKET_STATUSES),
  assigneeId: optionalId,
  assetId: optionalId,
  locationId: optionalId,
  resolution: optionalString,
  resolvedAt: optionalDate,
});

export const commentSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "required").max(8000, "maxLength"),
  isInternal: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export const resolveTicketSchema = z.object({
  ticketId: z.string().min(1),
  resolution: z.string().trim().min(2, "required"),
  close: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export const ticketCategorySchema = z.object({
  code: z.string().trim().min(2, "required").max(32, "maxLength").regex(/^[A-Z0-9_-]+$/, "codeFormat"),
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  nameEn: optionalString,
  parentId: optionalId,
  slaPolicyId: optionalId,
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v !== "false"),
});

export const slaPolicySchema = z.object({
  name: z.string().trim().min(2, "minLength").max(120, "maxLength"),
  priority: z.enum(TICKET_PRIORITIES),
  responseMinutes: z.coerce.number().int().min(1, "positive"),
  resolutionMinutes: z.coerce.number().int().min(1, "positive"),
  businessHoursOnly: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});
