# CRM dispatch scheduler

The CRM's periodic dispatch uses a private Vercel Function and Vercel Schedules.

## Preview-only execution

The Preview build script adds the static schedule to `.vercel/output/config.json` only when `VERCEL_GIT_COMMIT_REF=fix/cloudflare-minute-dispatch`. Production builds do not receive a schedule from this change.

- Schedule: `crm-dispatch`
- Cadence: every 15 minutes, UTC
- Target: private function `api/dispatch`
- The private function calls the authenticated `POST /internal/crm/dispatch` route inside the same Preview deployment.
- Vercel-hosted automation-bypass and branch-scoped bridge credentials remain inside Vercel.

The dispatch route performs the blank-fact sweep, stale-task reconciliation, task draining, due-agent scheduling, builder submission dispatch, and queued agent-run dispatch.

## Plan limits

Vercel Schedules is in public beta on all plans. Hobby includes 5,000 runs/month; a 15-minute schedule uses approximately 2,880 runs/month. Hobby applies a 15-minute jitter window, so this is not a strict one-minute or exact-minute SLA.

## Deployment safety

- The schedule is injected into the Preview build only.
- Preview database and `AGENT_BRIDGE_SECRET` are branch-scoped.
- SSO remains enabled.
- Production scheduling is not enabled by this change.
