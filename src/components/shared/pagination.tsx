"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { PAGE_SIZES } from "@/lib/query";
import { useFilterParams } from "./filter-bar";

export function Pagination({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}) {
  const t = useTranslations("common.table");
  const { setParam } = useFilterParams();

  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
      <span className="tabular">{t("showing", { from, to, total })}</span>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">{t("rowsPerPage")}</span>
          <NativeSelect
            value={String(perPage)}
            onChange={(e) => setParam("perPage", e.target.value)}
            className="h-8 w-20 text-xs"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect>
        </label>

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="iconSm"
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="px-1 tabular">{t("page", { page, pages })}</span>
          <Button
            variant="secondary"
            size="iconSm"
            disabled={page >= pages}
            onClick={() => setParam("page", String(page + 1))}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
