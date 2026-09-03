"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { SubmitButton, useActionForm } from "@/components/shared/form";
import { toDateInputValue } from "@/lib/format";
import { ASSET_CONDITIONS, ASSET_STATUSES, DEPRECIATION_METHODS } from "./schema";
import { SpecsEditor } from "./specs-editor";
import type { ActionResult } from "@/lib/action";

export type AssetFormOptions = {
  categories: {
    id: string;
    name: string;
    nameEn: string | null;
    defaultUsefulLifeMonths: number | null;
    defaultWarrantyMonths: number | null;
  }[];
  locations: { id: string; name: string; code: string }[];
  vendors: { id: string; name: string; isManufacturer: boolean; isSupplier: boolean }[];
  departments: { id: string; name: string; nameEn: string | null }[];
};

export type AssetDefaults = {
  id?: string;
  assetTag?: string | null;
  name?: string;
  categoryId?: string;
  status?: string;
  condition?: string;
  serialNumber?: string | null;
  model?: string | null;
  manufacturerId?: string | null;
  supplierId?: string | null;
  purchaseDate?: Date | null;
  purchaseCost?: string | number | null;
  currency?: string;
  invoiceNo?: string | null;
  poNumber?: string | null;
  warrantyMonths?: number | null;
  warrantyEndAt?: Date | null;
  usefulLifeMonths?: number | null;
  depreciationMethod?: string;
  salvageValue?: string | number | null;
  locationId?: string | null;
  departmentId?: string | null;
  notes?: string | null;
  specs?: Record<string, unknown> | null;
};

export function AssetForm({
  action,
  options,
  defaults = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>;
  options: AssetFormOptions;
  defaults?: AssetDefaults;
  submitLabel: string;
}) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { onSubmit, pending, fieldErrors, formError } = useActionForm(action, {
    redirectTo: (data) => `/assets/${data.id}`,
    successMessage: tc("toast.updated"),
  });

  const label = (item: { name: string; nameEn?: string | null }) =>
    locale === "en" && item.nameEn ? item.nameEn : item.name;

  return (
    <form action={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-7 py-5">
          <FormSection title={tc("labels.overview")}>
            <FieldGroup>
              <Field
                label={t("fields.assetTag")}
                htmlFor="assetTag"
                hint={defaults.id ? undefined : "AST-YYYY-0001"}
                error={fieldErrors.assetTag}
              >
                <Input
                  id="assetTag"
                  name="assetTag"
                  defaultValue={defaults.assetTag ?? ""}
                  className="font-mono"
                />
              </Field>

              <Field label={t("fields.name")} htmlFor="name" required error={fieldErrors.name}>
                <Input id="name" name="name" defaultValue={defaults.name ?? ""} required />
              </Field>

              <Field
                label={t("fields.category")}
                htmlFor="categoryId"
                required
                error={fieldErrors.categoryId}
              >
                <NativeSelect
                  id="categoryId"
                  name="categoryId"
                  defaultValue={defaults.categoryId ?? ""}
                  required
                >
                  <option value="">{tc("labels.selectPlaceholder")}</option>
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {label(c)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label={t("fields.model")} htmlFor="model">
                <Input id="model" name="model" defaultValue={defaults.model ?? ""} />
              </Field>

              <Field
                label={t("fields.serialNumber")}
                htmlFor="serialNumber"
                error={fieldErrors.serialNumber}
              >
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  defaultValue={defaults.serialNumber ?? ""}
                  className="font-mono"
                />
              </Field>

              <Field label={t("fields.manufacturer")} htmlFor="manufacturerId">
                <NativeSelect
                  id="manufacturerId"
                  name="manufacturerId"
                  defaultValue={defaults.manufacturerId ?? ""}
                >
                  <option value="">{tc("labels.notSet")}</option>
                  {options.vendors
                    .filter((v) => v.isManufacturer)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </NativeSelect>
              </Field>

              <Field label={t("fields.status")} htmlFor="status">
                <NativeSelect id="status" name="status" defaultValue={defaults.status ?? "IN_STOCK"}>
                  {ASSET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label={t("fields.condition")} htmlFor="condition">
                <NativeSelect id="condition" name="condition" defaultValue={defaults.condition ?? "NEW"}>
                  {ASSET_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {t(`condition.${c}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={t("fields.purchaseCost")}>
            <FieldGroup>
              <Field label={t("fields.supplier")} htmlFor="supplierId">
                <NativeSelect id="supplierId" name="supplierId" defaultValue={defaults.supplierId ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {options.vendors
                    .filter((v) => v.isSupplier)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </NativeSelect>
              </Field>

              <Field label={t("fields.purchaseDate")} htmlFor="purchaseDate" error={fieldErrors.purchaseDate}>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  defaultValue={toDateInputValue(defaults.purchaseDate)}
                />
              </Field>

              <Field label={t("fields.purchaseCost")} htmlFor="purchaseCost" error={fieldErrors.purchaseCost}>
                <Input
                  id="purchaseCost"
                  name="purchaseCost"
                  inputMode="numeric"
                  defaultValue={defaults.purchaseCost != null ? String(defaults.purchaseCost) : ""}
                  className="tabular"
                />
              </Field>

              <Field label={t("fields.currency")} htmlFor="currency">
                <NativeSelect id="currency" name="currency" defaultValue={defaults.currency ?? "VND"}>
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </NativeSelect>
              </Field>

              <Field label={t("fields.invoiceNo")} htmlFor="invoiceNo">
                <Input id="invoiceNo" name="invoiceNo" defaultValue={defaults.invoiceNo ?? ""} />
              </Field>

              <Field label={t("fields.poNumber")} htmlFor="poNumber">
                <Input id="poNumber" name="poNumber" defaultValue={defaults.poNumber ?? ""} />
              </Field>

              <Field
                label={t("fields.warrantyMonths")}
                htmlFor="warrantyMonths"
                error={fieldErrors.warrantyMonths}
              >
                <Input
                  id="warrantyMonths"
                  name="warrantyMonths"
                  inputMode="numeric"
                  defaultValue={defaults.warrantyMonths ?? ""}
                  className="tabular"
                />
              </Field>

              <Field
                label={t("fields.warrantyEndAt")}
                htmlFor="warrantyEndAt"
                hint={t("warranty.unknown")}
                error={fieldErrors.warrantyEndAt}
              >
                <Input
                  id="warrantyEndAt"
                  name="warrantyEndAt"
                  type="date"
                  defaultValue={toDateInputValue(defaults.warrantyEndAt)}
                />
              </Field>

              <Field
                label={t("fields.usefulLifeMonths")}
                htmlFor="usefulLifeMonths"
                error={fieldErrors.usefulLifeMonths}
              >
                <Input
                  id="usefulLifeMonths"
                  name="usefulLifeMonths"
                  inputMode="numeric"
                  defaultValue={defaults.usefulLifeMonths ?? ""}
                  className="tabular"
                />
              </Field>

              <Field label={t("fields.depreciationMethod")} htmlFor="depreciationMethod">
                <NativeSelect
                  id="depreciationMethod"
                  name="depreciationMethod"
                  defaultValue={defaults.depreciationMethod ?? "STRAIGHT_LINE"}
                >
                  {DEPRECIATION_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {t(`depreciation.${m}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label={t("fields.salvageValue")} htmlFor="salvageValue" error={fieldErrors.salvageValue}>
                <Input
                  id="salvageValue"
                  name="salvageValue"
                  inputMode="numeric"
                  defaultValue={defaults.salvageValue != null ? String(defaults.salvageValue) : ""}
                  className="tabular"
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={tc("labels.location")}>
            <FieldGroup>
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

              <Field label={t("fields.department")} htmlFor="departmentId">
                <NativeSelect id="departmentId" name="departmentId" defaultValue={defaults.departmentId ?? ""}>
                  <option value="">{tc("labels.notSet")}</option>
                  {options.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {label(d)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection title={t("fields.specs")}>
            <SpecsEditor name="specs" defaultValue={defaults.specs} />
          </FormSection>

          <FormSection title={tc("labels.notes")}>
            <Field htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} rows={3} />
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
