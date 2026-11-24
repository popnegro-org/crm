#!/usr/bin/env bash
set -euo pipefail

preview_schedule_target=""

cleanup_preview_schedule() {
  if [[ -n "$preview_schedule_target" ]]; then
    rm -f "$preview_schedule_target"
    rmdir "$(dirname "$preview_schedule_target")" 2>/dev/null || true
  fi
}
trap cleanup_preview_schedule EXIT

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

  preview_schedule_target="$repo_root/apps/agent/agent/schedules/dispatch.ts"
  mkdir -p "$(dirname "$preview_schedule_target")"
  cp "$repo_root/apps/agent/agent/lib/preview-dispatch-schedule.ts" "$preview_schedule_target"
  cd "$repo_root/apps/agent"
fi

bun run build
