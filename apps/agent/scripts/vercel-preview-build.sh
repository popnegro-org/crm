#!/usr/bin/env bash
set -euo pipefail

if [[ "${VERCEL_GIT_COMMIT_REF:-}" == "fix/cloudflare-minute-dispatch" ]]; then
  repo_root="$(git rev-parse --show-toplevel)"
  cd "$repo_root"
  bun run db:deploy
  bun run --filter agent check-types
  bun run --filter @crm/db check-types
  bun run --filter @crm/auth check-types
  bun run lint
  bun run lint:slop
  bun run --filter agent test
  cd apps/agent
fi

bun run build

if [[ "${VERCEL_GIT_COMMIT_REF:-}" == "fix/cloudflare-minute-dispatch" ]]; then
  node scripts/add-preview-schedule.mjs
fi
