/**
 * Renders authenticated pages in headless Chrome/Edge so the UI can be eyeballed.
 *
 *   npx tsx scripts/screenshot.ts /reports /assets
 *   SHOT_THEME=dark SMOKE_EMAIL=giang.vu@company.local npx tsx scripts/screenshot.ts /leave
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { launchBrowser } from "./lib/browser";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? join(process.cwd(), ".shots");
const THEME = process.env.SHOT_THEME ?? "light";
const LOCALE = process.env.SHOT_LOCALE ?? "vi";
const WIDTH = Number(process.env.SHOT_WIDTH ?? 1440);
const EMAIL = process.env.SMOKE_EMAIL ?? "admin@company.local";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser({ db, base: BASE, width: WIDTH, sessionTag: "screenshot" });

  try {
    await browser.signInAs(EMAIL);
    await browser.setCookie("itam_theme", THEME);
    await browser.setCookie("itam_locale", LOCALE);

    const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
    for (const path of paths) {
      await browser.goto(BASE + path, 2500);

      // Grow the viewport to the document so the shot is not cut off.
      const metrics = (await browser.send("Page.getLayoutMetrics")) as {
        cssContentSize?: { height: number };
      };
      const height = Math.min(Math.ceil(metrics.cssContentSize?.height ?? 1200), 4000);
      await browser.send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await delay(300);

      const shot = (await browser.send("Page.captureScreenshot", { format: "png" })) as { data: string };
      const name = (path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home") + `-${THEME}`;
      const file = join(OUT, `${name}.png`);
      writeFileSync(file, Buffer.from(shot.data, "base64"));
      console.log(`saved ${file} (${WIDTH}x${height})`);

      await browser.send("Emulation.clearDeviceMetricsOverride");
    }
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
