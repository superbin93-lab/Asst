FROM node:24-bookworm-slim AS base
WORKDIR /app

# ---- deps: install once, cached as long as package*.json don't change --------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: full source + production build ---------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` statically analyzes every route, which imports src/lib/db.ts and
# therefore src/lib/env.ts at module load time. It only needs well-formed
# values to pass Zod validation - it never opens a real connection - so these
# placeholders are safe; the real values come from docker-compose at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV AUTH_SECRET="0000000000000000000000000000000000000000000000000000000000"
RUN npm run build

# ---- runner: what actually ships ----------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Full src/ (not just src/generated) because prisma/seed.ts is run with tsx at
# container start and imports from src/lib directly.
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
