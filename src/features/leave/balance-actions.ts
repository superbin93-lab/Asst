"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import { balanceAdjustmentSchema, generateBalancesSchema } from "./schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

/**
 * Creates the missing balance rows for a year.
 *
 * Entitlement is prorated for anyone hired during the year, and unused days
 * from the previous year are carried over up to the leave type's cap.
 */
export async function generateBalances(formData: FormData): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_MANAGE);
    const parsed = generateBalancesSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { year } = parsed.data;
    const [employees, types] = await Promise.all([
      db.employee.findMany({
        where: { status: { not: "TERMINATED" } },
        select: { id: true, hireDate: true },
      }),
      db.leaveType.findMany({ where: { isActive: true, deductsBalance: true } }),
    ]);

    let count = 0;
    for (const employee of employees) {
      const hireYear = employee.hireDate.getFullYear();
      // Someone hired mid-year earns a proportional share of the entitlement.
      const monthsWorked =
        hireYear > year ? 0 : hireYear < year ? 12 : 12 - employee.hireDate.getMonth();

      if (monthsWorked === 0) continue;

      for (const type of types) {
        const entitled = Math.round((type.defaultDaysPerYear * monthsWorked) / 12 * 2) / 2;

        const previous = await db.leaveBalance.findUnique({
          where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: type.id, year: year - 1 } },
        });
        const unused = previous
          ? Math.max(
              0,
              previous.entitledDays + previous.carriedOverDays + previous.adjustmentDays - previous.usedDays,
            )
          : 0;
        const carriedOverDays = Math.min(unused, type.carryOverLimitDays);

        const existing = await db.leaveBalance.findUnique({
          where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: type.id, year } },
        });
        if (existing) continue;

        await db.leaveBalance.create({
          data: { employeeId: employee.id, leaveTypeId: type.id, year, entitledDays: entitled, carriedOverDays },
        });
        count++;
      }
    }

    await recordAudit({
      action: "CREATE", entityType: "LeaveBalance", userId: user.id,
      summary: `Generated ${count} balance rows for ${year}`,
    });

    revalidatePath("/leave/balances");
    return ok({ count });
  });
}

export async function adjustBalance(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.LEAVE_MANAGE);
    const parsed = balanceAdjustmentSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const { balanceId, adjustmentDays, note } = parsed.data;
    const balance = await db.leaveBalance.findUnique({
      where: { id: balanceId },
      include: { employee: { select: { fullName: true } }, leaveType: { select: { name: true } } },
    });
    if (!balance) return fail("notFound");

    await db.leaveBalance.update({
      where: { id: balanceId },
      data: { adjustmentDays, note },
    });

    await recordAudit({
      action: "UPDATE", entityType: "LeaveBalance", entityId: balanceId, userId: user.id,
      summary: `${balance.employee.fullName} / ${balance.leaveType.name}: ${adjustmentDays}`,
      changes: { adjustmentDays: { from: balance.adjustmentDays, to: adjustmentDays } },
    });

    revalidatePath("/leave/balances");
    return ok(undefined);
  });
}
