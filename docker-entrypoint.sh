#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "Seeding database..."
  # Best-effort: the app is usable once migrations are applied, so a seed
  # hiccup should not stop it from starting (and Docker won't crash-loop it).
  npx prisma db seed || echo "Seed failed, continuing without it."
fi

exec "$@"
