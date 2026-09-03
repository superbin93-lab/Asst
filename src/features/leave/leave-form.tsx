"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action";
import { calculateLeaveDays, indexHolidays } from "./workdays";
import { LEAVE_DAY_PARTS } from "./schema";

export type LeaveTypeOption = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  allowHalfDay: boolean;
  requiresAttachment: boolean;
  minNoticeDays: number;
  deductsBalance: boolean;
};

export type LeaveBalanceSummary = {
  leaveTypeId: string;
  available: number;
};

export function LeaveForm({
  action,
  types,
  employees,
  balances,
  holidays,
  workweek,
  canPickEmployee,
  defaultEmployeeId,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>;
  types: LeaveTypeOption[];
  employees: { id: string; fullName: string; employeeCode: string }[];
  balances: LeaveBalanceSummary[];
  /** Serialised as ISO strings so the payload crosses the server boundary. */
  holidays: { date: string; isHalfDay: boolean; isRecurring: boolean }[];
  workweek: number[];
  canPickEmployee: boolean;
  defaultEmployeeId?: string | null;
  submitLabel: string;
}) {
  const t = useTranslations("leave");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDayPart, setStartDayPart] = useState<"FULL" | "MORNING" | "AFTERNOON">("FULL");
  const [endDayPart, setEndDayPart] = useState<"FULL" | "MORNING" | "AFTERNOON">("FULL");

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(action, {
    redirectTo: (data) => `/leave/${data.id}`,
    successMessage: t("toast.submitted"),
  });

  const holidayIndex = useMemo(
    () => indexHolidays(holidays.map((h) => ({ ...h, date: new Date(h.date) }))),
    [holidays],
  );

  // Mirrors the server-side calculation so the day count is visible before submit.
  const estimate = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
    return calculateLeaveDays({ startDate: start, endDate: end, startDayPart, endDayPart }, workweek, holidayIndex)
      .totalDays;
  }, [startDate, endDate, startDayPart, endDayPart, workweek, holidayIndex]);

  const selectedType = types.find((x) => x.id === leaveTypeId);
  const available = balances.find((b) => b.leaveTypeId === leaveTypeId)?.available ?? 0;
  const typeLabel = (x: LeaveTypeOption) => (locale === "en" && x.nameEn ? x.nameEn : x.name);
  const overBalance = Boolean(selectedType?.deductsBalance && estimate !== null && estimate > available);

  return (
    <form action={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-4 py-5">
          <FieldGroup>
            {canPickEmployee ? (
              <Field label={t("fields.employee")} htmlFor="employeeId" error={fieldErrors.employeeId}>
                <NativeSelect id="employeeId" name="employeeId" defaultValue={defaultEmployeeId ?? ""}>
                  <option value="">{tc("labels.selectPlaceholder")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.fullName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            <Field label={t("fields.leaveType")} htmlFor="leaveTypeId" required error={fieldErrors.leaveTypeId}>
              <NativeSelect
                id="leaveTypeId"
                name="leaveTypeId"
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                required
              >
                {types.map((x) => (
                  <option key={x.id} value={x.id}>
                    {typeLabel(x)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label={t("fields.startDate")} htmlFor="startDate" required error={fieldErrors.startDate}>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </Field>

            <Field label={t("fields.endDate")} htmlFor="endDate" required error={fieldErrors.endDate}>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>

            <Field label={t("fields.startDayPart")} htmlFor="startDayPart" error={fieldErrors.startDayPart}>
              <NativeSelect
                id="startDayPart"
                name="startDayPart"
                value={startDayPart}
                onChange={(e) => setStartDayPart(e.target.value as typeof startDayPart)}
                disabled={!selectedType?.allowHalfDay}
              >
                {LEAVE_DAY_PARTS.map((p) => (
                  <option key={p} value={p}>
                    {t(`dayPart.${p}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label={t("fields.endDayPart")} htmlFor="endDayPart">
              <NativeSelect
                id="endDayPart"
                name="endDayPart"
                value={endDayPart}
                onChange={(e) => setEndDayPart(e.target.value as typeof endDayPart)}
                disabled={!selectedType?.allowHalfDay}
              >
                {LEAVE_DAY_PARTS.map((p) => (
                  <option key={p} value={p}>
                    {t(`dayPart.${p}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md bg-surface-muted px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              {t("fields.totalDays")}:{" "}
              <strong className="tabular">{estimate === null ? "-" : estimate}</strong>
            </span>
            {selectedType?.deductsBalance ? (
              <span className={overBalance ? "text-danger" : "text-muted-foreground"}>
                {t("balance.available")}: <strong className="tabular">{available}</strong>
              </span>
            ) : null}
            {selectedType && selectedType.minNoticeDays > 0 ? (
              <span className="text-xs text-muted-foreground">
                {t("types.minNoticeDays")}: {selectedType.minNoticeDays}
              </span>
            ) : null}
          </div>

          <Field label={t("fields.reason")} htmlFor="reason" required error={fieldErrors.reason}>
            <Textarea id="reason" name="reason" rows={3} required />
          </Field>

          <FieldGroup>
            <Field label={t("fields.contactPhone")} htmlFor="contactPhone">
              <Input id="contactPhone" name="contactPhone" inputMode="tel" />
            </Field>
            <Field label={t("fields.handoverTo")} htmlFor="handoverToId">
              <NativeSelect id="handoverToId" name="handoverToId" defaultValue="">
                <option value="">{tc("labels.notSet")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode} - {e.fullName}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>

          <Field label={t("fields.handoverNote")} htmlFor="handoverNote">
            <Textarea id="handoverNote" name="handoverNote" rows={2} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          {tc("actions.cancel")}
        </Button>
        <Button type="submit" name="saveAsDraft" value="on" variant="secondary" disabled={pending}>
          {t("status.DRAFT")}
        </Button>
        <SubmitButton pending={pending} disabled={overBalance}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
