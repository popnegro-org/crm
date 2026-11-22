export async function POST(): Promise<Response> {
  const deploymentUrl = process.env.VERCEL_URL;
  const bridgeSecret = process.env.AGENT_BRIDGE_SECRET;
  const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!deploymentUrl || !bridgeSecret || !protectionBypass) {
    console.error("CRM schedule is missing its required deployment configuration.");
    return Response.json({ error: "Schedule configuration unavailable." }, { status: 503 });
  }

  const response = await fetch(`https://${deploymentUrl}/internal/crm/dispatch`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${bridgeSecret}`,
      "x-vercel-protection-bypass": protectionBypass,
      "content-type": "application/json",
    },
    body: JSON.stringify({ trigger: "vercel-schedule" }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("CRM dispatch endpoint rejected scheduled invocation.", {
      status: response.status,
      detail: detail.slice(0, 500),
    });
    return Response.json({ error: "CRM dispatch failed." }, { status: 502 });
  }

  return Response.json({ ok: true, scheduled: true });
}
