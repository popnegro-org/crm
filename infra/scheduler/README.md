# CRM dispatch scheduler

The CRM's periodic dispatch runs through **Vercel Schedules** and a private Vercel Function.

## Execution

- Static schedule: `crm-dispatch`
- Cadence: every 15 minutes, UTC
- Target: private function `api/dispatch.ts`
- The private function calls the authenticated `POST /internal/crm/dispatch` route inside the same Preview deployment.
- Vercel's automation-bypass value and the branch-scoped `AGENT_BRIDGE_SECRET` remain inside Vercel; no credentials are copied to an external scheduler.

The dispatch route performs the blank-fact sweep, stale-task reconciliation, task draining, due-agent scheduling, builder submission dispatch, and queued agent-run dispatch.

## Plan limits

Vercel Schedules is in public beta on all plans. Hobby includes 5,000 runs/month; a 15-minute schedule uses approximately 2,880 runs/month. Hobby applies a 15-minute jitter window, so this is not a strict one-minute or exact-minute SLA.

## Deployment safety

- The schedule is validated on Preview only.
- Preview database and `AGENT_BRIDGE_SECRET` are branch-scoped.
- SSO remains enabled; the schedule function is private and uses the project automation-bypass secret for its internal request.
- Production scheduling is not enabled by this change.
