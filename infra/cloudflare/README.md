# CRM dispatch scheduler

The agent dispatch loop is invoked by a dedicated Cloudflare Worker Cron Trigger instead of a Vercel Cron Job.

## Why

The CRM dispatch loop must run every minute to sweep blank facts, reconcile stale tasks, drain queued tasks, queue due agent runs, and dispatch builder/run submissions. Vercel Hobby Cron Jobs cannot provide that cadence. Cloudflare Workers Free supports minute-level Cron Triggers, up to five triggers per account and 100,000 requests per day.

## Worker

Source: `infra/cloudflare/crm-dispatch-worker.js`

Configure these Worker bindings:

- `AGENT_URL`: HTTPS origin of the target Vercel Preview deployment (no path).
- `AGENT_BRIDGE_SECRET`: secret matching the Vercel Preview environment variable of the same name.

The Worker calls `POST /internal/crm/dispatch` with Bearer authentication. The endpoint is protected by constant-time secret comparison and responds `202` after registering the complete dispatch work.

## Deployment safety

- Keep the Vercel secret and database connection branch-scoped to the Preview branch.
- Point this scheduler only at that Preview origin while validating.
- Do not point it at Production or remove a Production scheduler without a separate Human Gate.
- Cron expression: `* * * * *` (UTC).
- The `GET /health` route reports Worker availability; it does not execute dispatch.

References:
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/platform/limits/
