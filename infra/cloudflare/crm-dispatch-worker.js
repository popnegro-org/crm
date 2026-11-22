async function dispatch(env) {
  const base = new URL(env.AGENT_URL);
  if (base.protocol !== "https:") {
    throw new Error("AGENT_URL must use HTTPS.");
  }

  const response = await fetch(new URL("/internal/crm/dispatch", base), {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.AGENT_BRIDGE_SECRET}`,
      "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`CRM dispatch returned HTTP ${response.status}.`);
  }

  console.log(JSON.stringify({
    event: "crm-dispatch-accepted",
    status: response.status,
    scheduledTime: new Date().toISOString(),
  }));
}

export default {
  async fetch(request) {
    if (request.method !== "GET" || new URL(request.url).pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }
    return Response.json({ ok: true, service: "crm-dispatch-scheduler" });
  },

  async scheduled(_controller, env, context) {
    context.waitUntil(dispatch(env));
  },
};
