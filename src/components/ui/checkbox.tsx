"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-4 shrink-0 rounded border border-border-strong bg-input data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-primary-foreground">
        {props.checked === "indeterminate" ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function CheckboxRow({
  label,
  hint,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = React.useId();
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} className="mt-0.5" {...props} />
      <label htmlFor={id} className="cursor-pointer select-none text-sm leading-tight">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </label>
    </div>
  );
}
