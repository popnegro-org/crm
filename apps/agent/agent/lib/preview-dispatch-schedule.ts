import { defineSchedule } from "eve/schedules";

export default defineSchedule({
	cron: "*/15 * * * *",
	timezone: "UTC",
	run({ waitUntil }) {
		const deploymentUrl = process.env.VERCEL_URL;
		const bridgeSecret = process.env.AGENT_BRIDGE_SECRET;
		const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

		if (!deploymentUrl || !bridgeSecret || !protectionBypass) {
			throw new Error(
				"CRM schedule is missing its required deployment configuration.",
			);
		}

		waitUntil(
			(async () => {
				const response = await fetch(
					`https://${deploymentUrl}/internal/crm/dispatch`,
					{
						method: "POST",
						headers: {
							authorization: `Bearer ${bridgeSecret}`,
							"x-vercel-protection-bypass": protectionBypass,
							"content-type": "application/json",
						},
						body: JSON.stringify({ trigger: "eve-schedule" }),
					},
				);

				if (!response.ok) {
					const detail = await response.text();
					throw new Error(
						`CRM dispatch rejected the scheduled invocation (${response.status}): ${detail.slice(0, 500)}`,
					);
				}
			})(),
		);
	},
});
