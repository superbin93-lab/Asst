"use client";

import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/input";
import { useFilterParams } from "@/components/shared/filter-bar";

export function ReportPeriodFilter() {
  const t = useTranslations("reports");
  const { searchParams, setParam } = useFilterParams();
  const value = searchParams.get("period") ?? "year";

  return (
    <NativeSelect
      aria-label={t("period")}
      value={value}
      onChange={(e) => setParam("period", e.target.value)}
      className="w-44"
    >
      <option value="month">{t("thisMonth")}</option>
      <option value="quarter">{t("thisQuarter")}</option>
      <option value="year">{t("thisYear")}</option>
    </NativeSelect>
  );
}
