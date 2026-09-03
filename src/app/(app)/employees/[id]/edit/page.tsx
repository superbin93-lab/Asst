import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployee, getEmployeeFormOptions } from "@/features/hr/queries";
import { updateEmployee } from "@/features/hr/actions";
import { EmployeeForm } from "@/features/hr/employee-form";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";

export default async function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  await requirePermission(PERMISSIONS.EMPLOYEE_UPDATE);
  const { id } = await params;

  const [t, tc, employee, options] = await Promise.all([
    getTranslations("hr.employees"),
    getTranslations("common.actions"),
    getEmployee(id),
    getEmployeeFormOptions(id),
  ]);
  if (!employee) notFound();

  const update = async (formData: FormData) => {
    "use server";
    return updateEmployee(id, formData);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/employees" },
          { label: employee.fullName, href: `/employees/${id}` },
          { label: t("edit") },
        ]}
      />
      <PageHeader title={t("edit")} description={employee.employeeCode} />
      <EmployeeForm
        action={update}
        options={options}
        submitLabel={tc("saveChanges")}
        defaults={{
          id: employee.id,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          email: employee.email,
          personalEmail: employee.personalEmail,
          phone: employee.phone,
          dateOfBirth: employee.dateOfBirth,
          gender: employee.gender,
          nationalId: employee.nationalId,
          taxCode: employee.taxCode,
          socialInsuranceNo: employee.socialInsuranceNo,
          address: employee.address,
          emergencyContact: employee.emergencyContact,
          emergencyPhone: employee.emergencyPhone,
          departmentId: employee.departmentId,
          positionId: employee.positionId,
          managerId: employee.managerId,
          locationId: employee.locationId,
          employmentType: employee.employmentType,
          status: employee.status,
          hireDate: employee.hireDate,
          probationEndDate: employee.probationEndDate,
          terminationDate: employee.terminationDate,
          terminationReason: employee.terminationReason,
          notes: employee.notes,
        }}
      />
    </div>
  );
}
