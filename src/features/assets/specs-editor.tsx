"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { key: string; value: string };

/**
 * Key/value editor for the asset `specs` JSON column. The rows are serialised
 * into a single hidden input so the form still posts as plain FormData.
 */
export function SpecsEditor({ name, defaultValue }: { name: string; defaultValue?: Record<string, unknown> | null }) {
  const [rows, setRows] = useState<Row[]>(() => {
    const entries = Object.entries(defaultValue ?? {});
    return entries.length > 0
      ? entries.map(([key, value]) => ({ key, value: String(value ?? "") }))
      : [{ key: "", value: "" }];
  });

  const serialised = JSON.stringify(
    Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])),
  );

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={serialised} />
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => update(index, { key: e.target.value })}
            placeholder="CPU"
            className="sm:w-48"
          />
          <Input
            value={row.value}
            onChange={(e) => update(index, { value: e.target.value })}
            placeholder="Intel Core i5-1345U"
          />
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={() => setRows((prev) => (prev.length === 1 ? [{ key: "", value: "" }] : prev.filter((_, i) => i !== index)))}
            aria-label="Remove row"
          >
            <Trash2 className="text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => setRows((prev) => [...prev, { key: "", value: "" }])}>
        <Plus />
        +
      </Button>
    </div>
  );
}
