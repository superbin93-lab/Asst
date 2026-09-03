"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { diffFields, recordAudit } from "@/lib/audit";
import { nextEmployeeCode } from "@/lib/sequence";
import { fail, ok, runAction, zodFieldErrors, type ActionResult } from "@/lib/action";
import { contractSchema, departmentSchema, employeeSchema, positionSchema } from "./schema";

const objectFromForm = (formData: FormData) => Object.fromEntries(formData.entries());

function revalidateHr(id?: string) {
  revalidatePath("/employees");
  revalidatePath("/employees/departments");
  revalidatePath("/employees/positions");
  revalidatePath("/employees/contracts");
  if (id) revalidatePath(`/employees/${id}`);
  revalidatePath("/");
}

export async function createEmployee(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.EMPLOYEE_CREATE);
    const parsed = employeeSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;

    if (input.employeeCode) {
      const clash = await db.employee.findUnique({ where: { employeeCode: input.employeeCode } });
      if (clash) return fail("validation", { employeeCode: "codeTaken" });
    }
    const emailClash = await db.employee.findUnique({ where: { email: input.email } });
    if (emailClash) return fail("validation", { email: "emailTaken" });

    const employee = await db.employee.create({
      data: { ...input, employeeCode: input.employeeCode ?? (await nextEmployeeCode()) },
    });

    // Give the new hire a leave balance for the current year straight away.
    const year = new Date().getFullYear();
    const types = await db.leaveType.findMany({ where: { isActive: true, deductsBalance: true } });
    const monthsRemaining = 12 - employee.hireDate.getMonth();
    for (const type of types) {
      const entitled =
        employee.hireDate.getFullYear() === year
          ? Math.round((type.defaultDaysPerYear * monthsRemaining) / 12 * 2) / 2
          : type.defaultDaysPerYear;
      await db.leaveBalance.create({
        data: { employeeId: employee.id, leaveTypeId: type.id, year, entitledDays: entitled },
      });
    }

    await recordAudit({
      action: "CREATE", entityType: "Employee", entityId: employee.id, userId: user.id,
      summary: `${employee.employeeCode} - ${employee.fullName}`,
    });

    revalidateHr(employee.id);
    return ok({ id: employee.id });
  });
}

export async function updateEmployee(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.EMPLOYEE_UPDATE);
    const parsed = employeeSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const before = await db.employee.findUnique({ where: { id } });
    if (!before) return fail("notFound");

    const input = parsed.data;
    if (input.managerId === id) return fail("validation", { managerId: "duplicate" });

    if (input.employeeCode && input.employeeCode !== before.employeeCode) {
      const clash = await db.employee.findUnique({ where: { employeeCode: input.employeeCode } });
      if (clash) return fail("validation", { employeeCode: "codeTaken" });
    }
    if (input.email !== before.email) {
      const clash = await db.employee.findUnique({ where: { email: input.email } });
      if (clash) return fail("validation", { email: "emailTaken" });
    }

    const employee = await db.employee.update({
      where: { id },
      data: { ...input, employeeCode: input.employeeCode ?? before.employeeCode },
    });

    const changes = diffFields(before as never, employee as never);
    if (Object.keys(changes).length > 0) {
      await recordAudit({
        action: "UPDATE", entityType: "Employee", entityId: id, userId: user.id,
        summary: `${employee.employeeCode} - ${employee.fullName}`, changes,
      });
    }

    revalidateHr(id);
    return ok({ id });
  });
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.EMPLOYEE_DELETE);
    const employee = await db.employee.findUnique({
      where: { id },
      select: {
        employeeCode: true, fullName: true,
        _count: { select: { assetsHeld: true, leaveRequests: true } },
      },
    });
    if (!employee) return fail("notFound");
    // Holding assets or leave history means the record must be retired, not deleted.
    if (employee._count.assetsHeld > 0) return fail("cannotDeleteInUse");

    await db.employee.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "Employee", entityId: id, userId: user.id,
      summary: `${employee.employeeCode} - ${employee.fullName}`,
    });

    revalidateHr();
    return ok(undefined);
  });
}

export async function saveDepartment(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ORG_MANAGE);
    const parsed = departmentSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    if (id && input.parentId === id) return fail("validation", { parentId: "duplicate" });

    const clash = await db.department.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const department = id
      ? await db.department.update({ where: { id }, data: input })
      : await db.department.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Department", entityId: department.id,
      userId: user.id, summary: `${department.code} - ${department.name}`,
    });

    revalidateHr();
    return ok({ id: department.id });
  });
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ORG_MANAGE);
    const department = await db.department.findUnique({
      where: { id },
      select: { code: true, name: true, _count: { select: { employees: true, children: true } } },
    });
    if (!department) return fail("notFound");
    if (department._count.employees > 0 || department._count.children > 0) {
      return fail("cannotDeleteInUse");
    }

    await db.department.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "Department", entityId: id, userId: user.id, summary: department.code,
    });

    revalidateHr();
    return ok(undefined);
  });
}

export async function savePosition(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ORG_MANAGE);
    const parsed = positionSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    const clash = await db.position.findUnique({ where: { code: input.code } });
    if (clash && clash.id !== id) return fail("validation", { code: "duplicate" });

    const position = id
      ? await db.position.update({ where: { id }, data: input })
      : await db.position.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "Position", entityId: position.id,
      userId: user.id, summary: `${position.code} - ${position.title}`,
    });

    revalidateHr();
    return ok({ id: position.id });
  });
}

export async function deletePosition(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.ORG_MANAGE);
    const position = await db.position.findUnique({
      where: { id },
      select: { code: true, _count: { select: { employees: true } } },
    });
    if (!position) return fail("notFound");
    if (position._count.employees > 0) return fail("cannotDeleteInUse");

    await db.position.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "Position", entityId: id, userId: user.id, summary: position.code,
    });

    revalidateHr();
    return ok(undefined);
  });
}

export async function saveContract(id: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.EMPLOYEE_UPDATE);
    const parsed = contractSchema.safeParse(objectFromForm(formData));
    if (!parsed.success) return fail("validation", zodFieldErrors(parsed.error));

    const input = parsed.data;
    if (input.endDate && input.endDate < input.startDate) {
      return fail("validation", { endDate: "endBeforeStart" });
    }

    const clash = await db.employmentContract.findUnique({ where: { contractNo: input.contractNo } });
    if (clash && clash.id !== id) return fail("validation", { contractNo: "duplicate" });

    const contract = id
      ? await db.employmentContract.update({ where: { id }, data: input })
      : await db.employmentContract.create({ data: input });

    await recordAudit({
      action: id ? "UPDATE" : "CREATE", entityType: "EmploymentContract", entityId: contract.id,
      userId: user.id, summary: contract.contractNo,
    });

    revalidateHr(input.employeeId);
    return ok({ id: contract.id });
  });
}

export async function deleteContract(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.EMPLOYEE_UPDATE);
    const contract = await db.employmentContract.findUnique({
      where: { id },
      select: { contractNo: true, employeeId: true },
    });
    if (!contract) return fail("notFound");

    await db.employmentContract.delete({ where: { id } });
    await recordAudit({
      action: "DELETE", entityType: "EmploymentContract", entityId: id, userId: user.id,
      summary: contract.contractNo,
    });

    revalidateHr(contract.employeeId);
    return ok(undefined);
  });
}
