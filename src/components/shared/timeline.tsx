import * as React from "react";
import { cn } from "@/lib/utils";

export type TimelineEntry = {
  id: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  body?: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
};

const DOT_TONES = {
  neutral: "bg-border-strong",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Timeline({ entries, empty }: { entries: TimelineEntry[]; empty: string }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className={cn(
              "absolute -left-[1.5625rem] top-1.5 size-2 rounded-full ring-4 ring-surface",
              DOT_TONES[entry.tone ?? "neutral"],
            )}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm">{entry.title}</p>
            {entry.meta ? <span className="text-xs text-muted-foreground">{entry.meta}</span> : null}
          </div>
          {entry.body ? <div className="mt-1 text-xs text-muted-foreground">{entry.body}</div> : null}
        </li>
      ))}
    </ol>
  );
}
