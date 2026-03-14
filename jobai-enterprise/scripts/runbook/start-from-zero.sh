#!/usr/bin/env bash
set -euo pipefail

echo "1) Start dependencies"
docker compose -f infra/compose/compose.yml --profile dev up -d --wait

echo "2) Wait for DB to be very ready"
sleep 5

echo "3) Apply DB migrations"
psql "${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/cvapp?sslmode=disable}" -f migrations/001_init.sql
psql "${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/cvapp?sslmode=disable}" -f migrations/002_security.sql
psql "${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/cvapp?sslmode=disable}" -f migrations/003_usage.sql

echo "4) Seed data (if existing)"
if [ -f "scripts/dev/seed.js" ]; then
  node scripts/dev/seed.js
fi

echo "5) Dependencies are ready"
echo "You can now run:"
echo "pnpm -C apps/api dev &"
echo "pnpm -C apps/api worker:dev &"
echo "pnpm -C apps/web dev &"
