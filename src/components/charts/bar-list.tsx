"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type BarDatum = {
  key: string;
  label: string;
  value: number;
  /** Optional override, e.g. a leave type's own configured colour. */
  color?: string;
  href?: string;
};

/**
 * Horizontal bar chart for "compare magnitude" data.
 *
 * One sequential blue hue (--viz-1..5, validated light and dark): the bars are a
 * single series so no legend is needed, and every bar is directly labelled with
 * its value, which doubles as the accessible text view.
 */
export function BarList({
  data,
  emptyLabel,
  locale = "vi",
  fractionDigits = 0,
  maxRows = 8,
  className,
}: {
  data: BarDatum[];
  emptyLabel: string;
  /** Formatting stays inside the client component: a formatter function
      cannot cross the server/client boundary. */
  locale?: "vi" | "en";
  fractionDigits?: number;
  maxRows?: number;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, maxRows);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = data.reduce((sum, r) => sum + r.value, 0);
  const format = (value: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "vi-VN", {
      maximumFractionDigits: fractionDigits,
    }).format(value);

  if (rows.length === 0 || total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  // Larger magnitude -> deeper step of the same hue.
  const rampStep = (value: number) => {
    const ratio = value / max;
    if (ratio > 0.8) return "var(--viz-5)";
    if (ratio > 0.6) return "var(--viz-4)";
    if (ratio > 0.4) return "var(--viz-3)";
    if (ratio > 0.2) return "var(--viz-2)";
    return "var(--viz-1)";
  };

  return (
    <ul className={cn("space-y-2.5", className)}>
      {rows.map((row) => {
        const percent = (row.value / max) * 100;
        const share = total > 0 ? (row.value / total) * 100 : 0;
        const active = hovered === row.key;

        return (
          <li
            key={row.key}
            className="relative"
            onMouseEnter={() => setHovered(row.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-foreground">{row.label}</span>
              <span className="shrink-0 tabular text-muted-foreground">
                {format(row.value)}
                <span className="ml-1.5 text-[11px]">{share.toFixed(0)}%</span>
              </span>
            </div>

            {/* Track is one step off the surface; the bar is the only loud thing. */}
            <div className="h-2.5 w-full overflow-hidden rounded-sm bg-viz-grid">
              <div
                className="h-full rounded-r-[4px] transition-[width,opacity] duration-300"
                style={{
                  width: `${Math.max(percent, 2)}%`,
                  backgroundColor: row.color ?? rampStep(row.value),
                  opacity: hovered && !active ? 0.55 : 1,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
