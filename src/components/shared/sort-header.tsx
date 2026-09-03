"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilterParams } from "./filter-bar";

export function SortHeader({
  field,
  label,
  className,
}: {
  field: string;
  label: string;
  className?: string;
}) {
  const { searchParams, setParam } = useFilterParams();
  const [activeField, activeDirection] = (searchParams.get("sort") ?? "").split(":");
  const active = activeField === field;
  const nextDirection = active && activeDirection !== "desc" ? "desc" : "asc";
  const Icon = !active ? ChevronsUpDown : activeDirection === "desc" ? ArrowDown : ArrowUp;

  return (
    <button
      type="button"
      onClick={() => setParam("sort", `${field}:${nextDirection}`)}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      {label}
      <Icon className={cn("size-3", !active && "opacity-40")} />
    </button>
  );
}
