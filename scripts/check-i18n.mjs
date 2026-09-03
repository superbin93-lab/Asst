#!/usr/bin/env node
/** Fails when the vi/en message namespaces drift apart. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const base = join(process.cwd(), "src", "messages");
const locales = ["vi", "en"];
const files = Object.fromEntries(
  locales.map((l) => [l, readdirSync(join(base, l)).filter((f) => f.endsWith(".json")).sort()]),
);

const problems = [];

for (const [a, b] of [["vi", "en"], ["en", "vi"]]) {
  for (const f of files[a]) {
    if (!files[b].includes(f)) problems.push(`${f} exists in ${a} but not in ${b}`);
  }
}

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

for (const f of files.vi.filter((f) => files.en.includes(f))) {
  const keys = Object.fromEntries(
    locales.map((l) => [l, flatten(JSON.parse(readFileSync(join(base, l, f), "utf8")))]),
  );
  for (const [a, b] of [["vi", "en"], ["en", "vi"]]) {
    for (const k of keys[a]) {
      if (!keys[b].includes(k)) problems.push(`${f}: "${k}" missing from ${b}`);
    }
  }
}

if (problems.length) {
  console.error("i18n check failed:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`i18n check passed (${files.vi.length} namespaces x ${locales.length} locales).`);
