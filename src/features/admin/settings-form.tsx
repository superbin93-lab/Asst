"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import type { AppSettings } from "@/lib/settings";
import { updateSettings } from "./actions";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const WEEKDAY_LABELS: Record<string, { vi: string; en: string }> = {
  mon: { vi: "Thứ 2", en: "Mon" },
  tue: { vi: "Thứ 3", en: "Tue" },
  wed: { vi: "Thứ 4", en: "Wed" },
  thu: { vi: "Thứ 5", en: "Thu" },
  fri: { vi: "Thứ 6", en: "Fri" },
  sat: { vi: "Thứ 7", en: "Sat" },
  sun: { vi: "Chủ nhật", en: "Sun" },
};

export function SettingsForm({ settings, locale }: { settings: AppSettings; locale: "vi" | "en" }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");

  const { onSubmit, pending, fieldErrors, formError } = useActionForm(updateSettings, {
    successMessage: t("saved"),
  });

  return (
    <form action={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-7 py-5">
          <FormSection title={t("company")}>
            <FieldGroup>
              <Field label={t("companyName")} htmlFor="companyName" error={fieldErrors.companyName}>
                <Input id="companyName" name="companyName" defaultValue={settings.companyName} />
              </Field>
              <Field label={t("companyTaxCode")} htmlFor="companyTaxCode">
                <Input id="companyTaxCode" name="companyTaxCode" defaultValue={settings.companyTaxCode} />
              </Field>
              <Field label={t("companyPhone")} htmlFor="companyPhone">
                <Input id="companyPhone" name="companyPhone" defaultValue={settings.companyPhone} />
              </Field>
              <Field label={t("companyEmail")} htmlFor="companyEmail">
                <Input id="companyEmail" name="companyEmail" defaultValue={settings.companyEmail} />
              </Field>
              <Field label={t("companyAddress")} htmlFor="companyAddress" className="sm:col-span-2">
                <Input id="companyAddress" name="companyAddress" defaultValue={settings.companyAddress} />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={t("localization")}>
            <FieldGroup>
              <Field label={t("currency")} htmlFor="currency">
                <NativeSelect id="currency" name="currency" defaultValue={settings.currency}>
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </NativeSelect>
              </Field>
              <Field label={t("timezone")} htmlFor="timezone">
                <Input id="timezone" name="timezone" defaultValue={settings.timezone} />
              </Field>
            </FieldGroup>

            <div>
              <p className="mb-2 text-xs font-medium">{t("workweek")}</p>
              <div className="flex flex-wrap gap-4">
                {WEEKDAY_KEYS.map((key, index) => (
                  <CheckboxRow
                    key={key}
                    name="workweek"
                    value={String(index + 1)}
                    defaultChecked={settings.workweek.includes(index + 1)}
                    label={WEEKDAY_LABELS[key][locale]}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{t("workweekHint")}</p>
            </div>
          </FormSection>

          <FormSection title={t("codes")}>
            <FieldGroup>
              <Field label={t("assetTagPrefix")} htmlFor="assetTagPrefix">
                <Input
                  id="assetTagPrefix"
                  name="assetTagPrefix"
                  defaultValue={settings.assetTagPrefix}
                  className="font-mono uppercase"
                />
              </Field>
              <Field label={t("ticketCodePrefix")} htmlFor="ticketCodePrefix">
                <Input
                  id="ticketCodePrefix"
                  name="ticketCodePrefix"
                  defaultValue={settings.ticketCodePrefix}
                  className="font-mono uppercase"
                />
              </Field>
              <Field label={t("leaveCodePrefix")} htmlFor="leaveCodePrefix">
                <Input
                  id="leaveCodePrefix"
                  name="leaveCodePrefix"
                  defaultValue={settings.leaveCodePrefix}
                  className="font-mono uppercase"
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={t("leavePolicy")}>
            <FieldGroup>
              <Field
                label={t("approvalLevels")}
                htmlFor="approvalLevels"
                hint={t("approvalLevelsHint")}
                error={fieldErrors.approvalLevels}
              >
                <NativeSelect
                  id="approvalLevels"
                  name="approvalLevels"
                  defaultValue={String(settings.approvalLevels)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </NativeSelect>
              </Field>
              <Field label={t("warrantyAlertDays")} htmlFor="warrantyAlertDays" error={fieldErrors.warrantyAlertDays}>
                <Input
                  id="warrantyAlertDays"
                  name="warrantyAlertDays"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={settings.warrantyAlertDays}
                  className="tabular"
                />
              </Field>
              <Field label={t("licenseAlertDays")} htmlFor="licenseAlertDays" error={fieldErrors.licenseAlertDays}>
                <Input
                  id="licenseAlertDays"
                  name="licenseAlertDays"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={settings.licenseAlertDays}
                  className="tabular"
                />
              </Field>
            </FieldGroup>
          </FormSection>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pending={pending}>{tc("actions.saveChanges")}</SubmitButton>
      </div>
    </form>
  );
}
