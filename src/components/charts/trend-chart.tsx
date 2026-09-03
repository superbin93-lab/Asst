"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TrendPoint = { label: string; value: number };

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 26, left: 40 };

/** Rounds an axis maximum up to a clean 1/2/5 x 10^n step. */
function niceMax(value: number): { max: number; step: number } {
  if (value <= 0) return { max: 4, step: 1 };
  const raw = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;
  return { max: step * 4, step };
}

/**
 * Single-series trend: 2px line over a 10% area wash, hairline gridlines and a
 * crosshair tooltip. One series means no legend - the card title names it.
 */
export function TrendChart({
  data,
  valueLabel,
  emptyLabel,
  className,
}: {
  data: TrendPoint[];
  valueLabel: string;
  emptyLabel: string;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (data.length === 0) return null;
    const { max, step } = niceMax(Math.max(...data.map((d) => d.value)));
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

    const points = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.value) }));
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
    const area = `${line} L${points.at(-1)!.cx.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${points[0].cx.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

    const ticks = Array.from({ length: 5 }, (_, i) => ({ value: i * step, y: y(i * step) }));
    return { points, line, area, ticks, baseline: PAD.top + innerH };
  }, [data]);

  if (!chart) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const active = activeIndex === null ? null : chart.points[activeIndex];

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !chart) return;
    const rect = svg.getBoundingClientRect();
    const ratio = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    chart.points.forEach((p, i) => {
      const distance = Math.abs(p.cx - ratio);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  }

  // Label every other tick when the series is dense, so text never collides.
  const labelEvery = chart.points.length > 8 ? 2 : 1;

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={valueLabel}
        onMouseMove={handleMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {chart.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={tick.y + 3.5}
              textAnchor="end"
              className="fill-[var(--muted-foreground)] text-[10px] tabular"
            >
              {tick.value.toLocaleString()}
            </text>
          </g>
        ))}

        <path d={chart.area} fill="var(--viz-3)" opacity={0.1} />
        <path
          d={chart.line}
          fill="none"
          stroke="var(--viz-3)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active ? (
          <line
            x1={active.cx}
            x2={active.cx}
            y1={PAD.top}
            y2={chart.baseline}
            stroke="var(--viz-axis)"
            strokeWidth={1}
          />
        ) : null}

        {chart.points.map((point, i) => (
          <circle
            key={point.label}
            cx={point.cx}
            cy={point.cy}
            r={activeIndex === i ? 5 : 4}
            fill="var(--viz-3)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}

        {chart.points.map((point, i) =>
          i % labelEvery === 0 ? (
            <text
              key={`x-${point.label}`}
              x={point.cx}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-[var(--muted-foreground)] text-[10px]"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(active.cx / WIDTH) * 100}%`,
            top: `${(active.cy / HEIGHT) * 100}%`,
          }}
        >
          <span className="block text-[11px] text-muted-foreground">{active.label}</span>
          <span className="block font-medium tabular">
            {active.value.toLocaleString()} {valueLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
