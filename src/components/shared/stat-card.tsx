import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "text-muted-foreground bg-neutral-subtle",
  primary: "text-primary bg-primary-subtle",
  success: "text-success bg-success-subtle",
  warning: "text-warning bg-warning-subtle",
  danger: "text-danger bg-danger-subtle",
  info: "text-info bg-info-subtle",
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof TONES;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-start gap-3">
      {icon ? (
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4.5", TONES[tone])}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular leading-tight">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );

  const className =
    "block rounded-lg border border-border bg-surface p-4 transition-colors" +
    (href ? " hover:border-border-strong hover:bg-surface-muted/50" : "");

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
