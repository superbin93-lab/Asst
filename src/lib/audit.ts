import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import type { AuditAction } from "@/generated/prisma/enums";

type AuditInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  changes?: Record<string, unknown> | null;
  userId?: string | null;
};

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    undefined
  );
}

/**
 * Audit writes must never break the operation they describe, so failures are
 * logged and swallowed rather than propagated.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        changes: (input.changes ?? undefined) as never,
        userId: input.userId ?? null,
        ip: await clientIp(),
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
}

/** Field-level diff for UPDATE entries; skips unchanged and internal fields. */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  ignore: string[] = ["updatedAt", "createdAt"],
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, next] of Object.entries(after)) {
    if (ignore.includes(key)) continue;
    const prev = before[key];
    const same =
      prev instanceof Date && next instanceof Date
        ? prev.getTime() === next.getTime()
        : String(prev ?? "") === String(next ?? "");
    if (!same) changes[key] = { from: prev ?? null, to: next ?? null };
  }
  return changes;
}
