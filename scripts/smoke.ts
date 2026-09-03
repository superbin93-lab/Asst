/**
 * End-to-end smoke test: mints a real session for the seeded admin, then walks
 * the app over HTTP and reports the status of every page.
 *
 *   npm run smoke            # against http://localhost:3000
 *   SMOKE_BASE=... npm run smoke
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "admin@company.local";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function mintSession(): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { email: EMAIL } });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3_600_000),
      userAgent: "smoke-test",
    },
  });
  return token;
}

async function main() {
  const token = await mintSession();
  const cookie = `itam_session=${token}; itam_locale=vi`;

  const paths = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["/", "/assets", "/assets/new", "/tickets/mine", "/leave", "/employees", "/admin/users"];

  let failures = 0;
  for (const path of paths) {
    const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
    const location = res.headers.get("location");
    const bad = res.status >= 400 || (res.status >= 300 && location?.includes("/login"));
    if (bad) failures++;

    let detail = "";
    if (res.status >= 400) {
      const body = await res.text();
      const match = body.match(/<h1[^>]*>([^<]{0,120})</) ?? body.match(/Error: ([^\n<]{0,160})/);
      detail = match ? ` :: ${match[1].trim()}` : "";
    }
    console.log(`${bad ? "FAIL" : " ok "}  ${String(res.status).padEnd(3)} ${path}${location ? ` -> ${location}` : ""}${detail}`);
  }

  await db.session.deleteMany({ where: { userAgent: "smoke-test" } });
  console.log(failures === 0 ? "\nAll pages responded." : `\n${failures} page(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => db.$disconnect());
