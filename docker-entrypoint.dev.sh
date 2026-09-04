#!/bin/sh
set -e

# The compose bind mount replaces /app, which hides the src/generated produced by
# `npm ci` inside the image. The Prisma client is gitignored too, so it has to be
# regenerated against the mounted working tree on every start. It is pure
# TypeScript (generator `prisma-client` + driver adapter), so the output is
# equally usable by a native `npm run dev` on the host.
echo "==> Generating Prisma client..."
npx prisma generate

# compose waits for the db healthcheck before starting this container, so no
# retry loop is needed here.
echo "==> Applying migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> Seeding database..."
  # Best-effort: the app is usable once migrations are applied.
  npx prisma db seed || echo "Seed failed, continuing without it."
fi

echo "==> Starting dev server on http://localhost:3000"
exec "$@"
