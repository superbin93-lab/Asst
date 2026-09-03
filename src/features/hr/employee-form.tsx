"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { toDateInputValue } from "@/lib/format";
import type { ActionResult } from "@/lib/action";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, GENDERS } from "./schema";

export type EmployeeFormOptions = {
  departments: { id: string; name: string; nameEn: string | null; code: string }[];
  positions: { id: string; title: string; titleEn: string | null; code: string }[];
  locations: { id: string; name: string; code: string }[];
  managers: { id: string; fullName: string; employeeCode: string }[];
};

export type EmployeeDefaults = Partial<{
  id: string;
  employeeCode: string | null;
  fullName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  nationalId: string | null;
  taxCode: string | null;
  socialInsuranceNo: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  locationId: string | null;
  employmentType: string;
  status: string;
  hireDate: Date;
  probationEndDate: Date | null;
  terminationDate: Date | null;
  terminationReason: string | null;
  notes: string | null;
}>;

export function EmployeeForm({
  action,
  options,
  defaults = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>;
  options: EmployeeFormOptions;
  defaults?: EmployeeDefaults;
  submitLabel: string;
}) {
  const t = useTranslations("hr.employees");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(action, {
    redirectTo: (data) => `/employees/${data.id}`,
    successMessage: tc("toast.updated"),
  });

  const deptLabel = (d: { name: string; nameEn: string | null }) =>
    locale === "en" && d.nameEn ? d.nameEn : d.name;
  const posLabel = (p: { title: string; titleEn: string | null }) =>
    locale === "en" && p.titleEn ? p.titleEn : p.title;

  return (
    <form action={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-7 py-5">
          <FormSection title={t("tabs.profile")}>
            <FieldGroup>
              <Field label={t("fields.employeeCode")} htmlFor="employeeCode" error={fieldErrors.employeeCode}>
                <Input
                  id="employeeCode"
                  name="employeeCode"
                  defaultValue={defaults.employeeCode ?? ""}
                  className="font-mono"
                />
              </Field>
              <Field label={t("fields.fullName")} htmlFor="fullName" required error={fieldErrors.fullName}>
                <Input id="fullName" name="fullName" defaultValue={defaults.fullName ?? ""} required />
              </Field>
              <Field label={t("fields.email")} htmlFor="email" required error={fieldErrors.email}>
                <Input id="email" name="email" type="email" defaultValue={defaults.email ?? ""} required />
              </Field>
              <Field label={t("fields.personalEmail")} htmlFor="personalEmail" error={fieldErrors.personalEmail}>
                <Input
                  id="personalEmail"
                  name="personalEmail"
                  type="email"
                  defaultValue={defaults.personalEmail ?? ""}
                />
              </Field>
              <Field label={t("fields.phone")} htmlFor="phone">
                <Input id="phone" name="phone" inputMode="tel" defaultValue={defaults.phone ?? ""} />
              </Field>
              <Field label={t("fields.dateOfBirth")} htmlFor="dateOfBirth" error={fieldErrors.dateOfBirth}>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={toDateInputValue(defaults.dateOfBirth)}
                />
              </Field>
              <Field label={t("fields.gender")} htmlFor="gender">
                <NativeSelect id="gender" name="gender" defaultValue={defaults.gender ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {t(`gender.${g}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.nationalId")} htmlFor="nationalId">
                <Input id="nationalId" name="nationalId" defaultValue={defaults.nationalId ?? ""} />
              </Field>
              <Field label={t("fields.taxCode")} htmlFor="taxCode">
                <Input id="taxCode" name="taxCode" defaultValue={defaults.taxCode ?? ""} />
              </Field>
              <Field label={t("fields.socialInsuranceNo")} htmlFor="socialInsuranceNo">
                <Input
                  id="socialInsuranceNo"
                  name="socialInsuranceNo"
                  defaultValue={defaults.socialInsuranceNo ?? ""}
                />
              </Field>
              <Field label={t("fields.address")} htmlFor="address" className="sm:col-span-2">
                <Input id="address" name="address" defaultValue={defaults.address ?? ""} />
              </Field>
              <Field label={t("fields.emergencyContact")} htmlFor="emergencyContact">
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  defaultValue={defaults.emergencyContact ?? ""}
                />
              </Field>
              <Field label={t("fields.emergencyPhone")} htmlFor="emergencyPhone">
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  inputMode="tel"
                  defaultValue={defaults.emergencyPhone ?? ""}
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={t("fields.department")}>
            <FieldGroup>
              <Field label={t("fields.department")} htmlFor="departmentId">
                <NativeSelect id="departmentId" name="departmentId" defaultValue={defaults.departmentId ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {options.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deptLabel(d)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.position")} htmlFor="positionId">
                <NativeSelect id="positionId" name="positionId" defaultValue={defaults.positionId ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {options.positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {posLabel(p)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.manager")} htmlFor="managerId" error={fieldErrors.managerId}>
                <NativeSelect id="managerId" name="managerId" defaultValue={defaults.managerId ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {options.managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.employeeCode} - {m.fullName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.location")} htmlFor="locationId">
                <NativeSelect id="locationId" name="locationId" defaultValue={defaults.locationId ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {options.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.employmentType")} htmlFor="employmentType">
                <NativeSelect
                  id="employmentType"
                  name="employmentType"
                  defaultValue={defaults.employmentType ?? "FULL_TIME"}
                >
                  {EMPLOYMENT_TYPES.map((x) => (
                    <option key={x} value={x}>
                      {t(`employmentType.${x}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.status")} htmlFor="status">
                <NativeSelect id="status" name="status" defaultValue={defaults.status ?? "PROBATION"}>
                  {EMPLOYEE_STATUSES.map((x) => (
                    <option key={x} value={x}>
                      {t(`status.${x}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("fields.hireDate")} htmlFor="hireDate" required error={fieldErrors.hireDate}>
                <Input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  required
                  defaultValue={toDateInputValue(defaults.hireDate ?? new Date())}
                />
              </Field>
              <Field label={t("fields.probationEndDate")} htmlFor="probationEndDate">
                <Input
                  id="probationEndDate"
                  name="probationEndDate"
                  type="date"
                  defaultValue={toDateInputValue(defaults.probationEndDate)}
                />
              </Field>
              <Field label={t("fields.terminationDate")} htmlFor="terminationDate">
                <Input
                  id="terminationDate"
                  name="terminationDate"
                  type="date"
                  defaultValue={toDateInputValue(defaults.terminationDate)}
                />
              </Field>
              <Field label={t("fields.terminationReason")} htmlFor="terminationReason">
                <Input
                  id="terminationReason"
                  name="terminationReason"
                  defaultValue={defaults.terminationReason ?? ""}
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={tc("labels.notes")}>
            <Field htmlFor="notes">
              <Textarea id="notes" name="notes" rows={3} defaultValue={defaults.notes ?? ""} />
            </Field>
          </FormSection>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          {tc("actions.cancel")}
        </Button>
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
