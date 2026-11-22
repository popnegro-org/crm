export async function register(): Promise<void> {
	const { default: service } = await import("./service.mjs");
	const { useDatabaseUrl } = await import("@crm/db");

	const { db } = service.load();
	useDatabaseUrl(db.url);

	process.env.BETTER_AUTH_SECRET = service.input().authSecret.expose();
}
