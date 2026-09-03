import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(7),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DEFAULT_LOCALE: z.enum(["vi", "en"]).default("vi"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill it in.`);
}

export const env = parsed.data;
