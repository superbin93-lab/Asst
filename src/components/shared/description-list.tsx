import * as React from "react";
import { cn } from "@/lib/utils";

export function DescriptionList({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)} {...props} />;
}

export function DescriptionItem({
  label,
  children,
  className,
  wide,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && "sm:col-span-2", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children ?? "-"}</dd>
    </div>
  );
}
