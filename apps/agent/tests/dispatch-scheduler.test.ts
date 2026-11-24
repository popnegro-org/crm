import { afterEach, describe, expect, it } from "bun:test";
import schedule from "../agent/lib/preview-dispatch-schedule";

const envKeys = [
	"VERCEL_URL",
	"AGENT_BRIDGE_SECRET",
	"VERCEL_AUTOMATION_BYPASS_SECRET",
] as const;

const originalEnv = Object.fromEntries(
	envKeys.map((key) => [key, process.env[key]]),
);
const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;

	for (const key of envKeys) {
		const value = originalEnv[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

async function invokeSchedule(): Promise<Promise<unknown>[]> {
	const pending: Promise<unknown>[] = [];
	await schedule.run({
		to: (() => {
			throw new Error(
				"The dispatch schedule must not send channel messages.",
			);
		}) as never,
		waitUntil(task) {
			pending.push(task);
		},
		appAuth: {} as never,
	});
	return pending;
}

describe("Preview CRM dispatch schedule", () => {
	it("uses the supported 15-minute UTC cadence", () => {
		expect(schedule.cron).toBe("*/15 * * * *");
		expect(schedule).not.toHaveProperty("timezone");
	});

	it("fails closed when deployment credentials are missing", async () => {
		for (const key of envKeys) delete process.env[key];

		await expect(invokeSchedule()).rejects.toThrow(
			"CRM schedule is missing its required deployment configuration.",
		);
	});

	it("forwards an authenticated request to the current deployment", async () => {
		process.env.VERCEL_URL = "crm-agent-preview.example.vercel.app";
		process.env.AGENT_BRIDGE_SECRET = "test-bridge-secret";
		process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "test-protection-bypass";

		const calls: Array<{ url: string; init?: RequestInit }> = [];
		globalThis.fetch = (async (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			calls.push({ url: String(input), init });
			return new Response(null, { status: 202 });
		}) as typeof fetch;

		const pending = await invokeSchedule();
		await Promise.all(pending);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe(
			"https://crm-agent-preview.example.vercel.app/internal/crm/dispatch",
		);

		const headers = new Headers(calls[0]?.init?.headers);
		expect(headers.get("authorization")).toBe("Bearer test-bridge-secret");
		expect(headers.get("x-vercel-protection-bypass")).toBe(
			"test-protection-bypass",
		);
	});

	it("fails the scheduled invocation when the dispatcher rejects", async () => {
		process.env.VERCEL_URL = "crm-agent-preview.example.vercel.app";
		process.env.AGENT_BRIDGE_SECRET = "test-bridge-secret";
		process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "test-protection-bypass";

		globalThis.fetch = (async () =>
			new Response("Unauthorized", { status: 401 })) as typeof fetch;

		const pending = await invokeSchedule();
		await expect(Promise.all(pending)).rejects.toThrow(
			"CRM dispatch rejected the scheduled invocation (401): Unauthorized",
		);
	});
});
