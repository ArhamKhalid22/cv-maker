#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="backups/$STAMP"
mkdir -p "$OUT"

# 1) Source snapshot
git rev-parse HEAD > "$OUT/git_commit.txt" || echo "No git repo" > "$OUT/git_commit.txt"
git status --porcelain > "$OUT/git_status_porcelain.txt" || true

# 2) DB snapshot (PostgreSQL custom format)
pg_dump -Fc \
  --host "${PGHOST:-localhost}" \
  --port "${PGPORT:-5432}" \
  --username "${PGUSER:-postgres}" \
  --dbname "${PGDATABASE:-cvapp}" \
  > "$OUT/db.dump" || true

# 3) Optional: globals
pg_dumpall --globals-only \
  --host "${PGHOST:-localhost}" \
  --port "${PGPORT:-5432}" \
  --username "${PGUSER:-postgres}" \
  > "$OUT/db_globals.sql" || true

# 4) Redis persistence notes
echo "NOTE: Redis snapshot is deployment-dependent; capture AOF/RDB if enabled." > "$OUT/redis_note.txt"

# 5) Env inventory (NO SECRETS)
env | grep -E '^(APP_|PUBLIC_|NODE_ENV|DATABASE_URL|REDIS_URL)=' > "$OUT/env_sanitized.txt" || true

echo "Snapshot written to $OUT"
