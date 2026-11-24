# CRM dispatch scheduler

The CRM dispatch uses Eve's native schedule compiler and a private Vercel schedule function.

## Preview-only execution

The Preview build script copies the typed schedule definition into Eve's authored schedule directory only when `VERCEL_GIT_COMMIT_REF=fix/cloudflare-minute-dispatch`. Eve compiles and packages the private function into `.vercel/output`; the build script removes the temporary source file after the build. Production builds never receive this schedule definition.

- Schedule: `eve.dispatch`
- Cadence: every 15 minutes, UTC
- Target: Eve-generated private schedule function
- The function calls the authenticated `POST /internal/crm/dispatch` route inside the same Preview deployment.
- The Vercel automation-bypass and branch-scoped bridge credentials remain inside Vercel.

The dispatch route performs the blank-fact sweep, stale-task reconciliation, task draining, due-agent scheduling, builder submission dispatch, and queued agent-run dispatch.

## Plan limits

Vercel Hobby schedules have a minimum cadence of 15 minutes and a jitter window. This is not a strict one-minute or exact-minute SLA.

## Deployment safety

- The schedule source is added to Eve's build only for the dedicated Preview branch.
- Preview database and dispatch credentials are branch-scoped.
- SSO remains enabled.
- Production scheduling is not enabled by this change.
