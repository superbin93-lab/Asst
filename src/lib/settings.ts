import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "./db";

export const SETTINGS_KEY = "app";

/** Monday = 1 ... Sunday = 7 (ISO), matching the workweek picker in settings. */
export const settingsSchema = z.object({
  companyName: z.string().default("Công ty của bạn"),
  companyTaxCode: z.string().default(""),
  companyAddress: z.string().default(""),
  companyPhone: z.string().default(""),
  companyEmail: z.string().default(""),
  currency: z.string().default("VND"),
  timezone: z.string().default("Asia/Ho_Chi_Minh"),
  workweek: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5]),
  assetTagPrefix: z.string().default("AST"),
  ticketCodePrefix: z.string().default("TK"),
  leaveCodePrefix: z.string().default("LV"),
  approvalLevels: z.number().int().min(1).max(3).default(2),
  warrantyAlertDays: z.number().int().min(1).max(365).default(30),
  licenseAlertDays: z.number().int().min(1).max(365).default(30),
});

export type AppSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = settingsSchema.parse({});

export const getSettings = cache(async (): Promise<AppSettings> => {
  const row = await db.setting.findUnique({ where: { key: SETTINGS_KEY } });
  const parsed = settingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
});

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = settingsSchema.parse({ ...current, ...patch });
  await db.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next },
    update: { value: next },
  });
  return next;
}
