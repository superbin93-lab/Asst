import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const user = await db.user.findUniqueOrThrow({ where: { email: "admin@company.local" } });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3_600_000),
      userAgent: "smoke-detail",
    },
  });
  const cookie = `itam_session=${token}`;

  const [assets, tickets, employees] = await Promise.all([
    db.asset.findMany({ take: 1, select: { id: true } }),
    db.ticket.findMany({ take: 1, select: { id: true } }),
    db.employee.findMany({ take: 1, select: { id: true } }),
  ]);

  const paths = [
    ...assets.flatMap((a) => [`/assets/${a.id}`, `/assets/${a.id}/edit`]),
    ...tickets.map((t) => `/tickets/${t.id}`),
    ...employees.map((e) => `/employees/${e.id}`),
  ];

  {
    for (const path of paths) {
      const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
      let detail = "";
      if (res.status >= 400) {
        const body = await res.text();
        const m = body.match(/<h1[^>]*>([^<]{0,160})</) ?? body.match(/([A-Za-z]*Error:[^\n<]{0,160})/);
        detail = m ? ` :: ${m[1].trim()}` : "";
      }
      console.log(`${String(res.status).padEnd(4)} ${path}${detail}`);
    }
  }

  await db.session.deleteMany({ where: { userAgent: "smoke-detail" } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
