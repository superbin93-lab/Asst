import * as React from "react";
import { cn } from "@/lib/utils";

/** Two-letter initials from a Vietnamese full name: "Lê Minh Cường" -> "MC". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts.at(-2)![0] + parts.at(-1)![0]).toUpperCase();
}

const SIZES = { sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm" };

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-subtle font-semibold text-primary",
        SIZES[size],
        className,
      )}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
