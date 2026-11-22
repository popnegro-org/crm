import "@crm/env/load";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "./generated/prisma/client";

let injectedUrl: string | undefined;

function liveUrl(): string | undefined {
	if (injectedUrl) return injectedUrl;
	const url = process.env.DATABASE_URL;
	if (!url) return undefined;
	return url;
}

function liveDatabase(): string {
	const url = liveUrl();

	if (!url) {
		throw new Error(
			"DATABASE_URL is not set. Copy .env.example to .env at the root of the repo and fill it in, or set DATABASE_URL in the environment.",
		);
	}

	return url;
}

function connectionString(): string {
	return process.env.NODE_ENV === "test" ? testDatabase() : liveDatabase();
}

/**
 * Points the classic client at another Postgres — the Compute path calls this
 * once at boot with the URL its service declaration loaded, since
 * `DATABASE_URL` is not set there.
 */
export function useDatabaseUrl(url: string): void {
	injectedUrl = url;
	clientInstance = undefined;
}

function testDatabase(): string {
	const url = process.env.TEST_DATABASE_URL;

	if (!url) {
		throw new Error(
			[
				"TEST_DATABASE_URL is not set, and the suite will not fall back to DATABASE_URL.",
				"",
				"These are real integration tests. They delete every workspace member and the",
				"organization row and put them back when the run finishes — so a run that is",
				"interrupted leaves everybody locked out of whatever database it was pointed at.",
				"The pre-push hook runs them, so that is one `git push` away from a database you",
				"care about.",
				"",
				"Make a throwaway one and point TEST_DATABASE_URL at it:",
				"",
				"    bun run db:test",
				"",
			].join("\n"),
		);
	}

	if (!databaseName(url).endsWith("_test")) {
		throw new Error(
			`TEST_DATABASE_URL must name a database ending in _test, so it cannot be one somebody is using. It names "${databaseName(url)}".`,
		);
	}

	return url;
}

function databaseName(url: string): string {
	try {
		return new URL(url).pathname.replace(/^\//, "");
	} catch {
		return url;
	}
}

export interface PrismaLogRecord {
	level: Prisma.LogLevel;
	message: string;
	target: string;
	durationMs?: number;
}

export type PrismaLogSink = (record: PrismaLogRecord) => void;

const consoleSink: PrismaLogSink = ({ level, message, target, durationMs }) => {
	const suffix = durationMs === undefined ? "" : ` (+${durationMs}ms)`;
	const line = `[prisma:${level}] ${message}${suffix} [${target}]`;

	if (level === "error") {
		console.error(line);
	} else if (level === "warn") {
		console.warn(line);
	} else {
		console.log(line);
	}
};

let sink: PrismaLogSink = consoleSink;

export function setPrismaLogSink(next: PrismaLogSink | null): void {
	sink = next ?? consoleSink;
}

const logQueries = process.env.PRISMA_LOG_QUERIES === "true";

const logDefinitions: Prisma.LogDefinition[] = [
	{ level: "warn", emit: "event" },
	{ level: "error", emit: "event" },
	...(logQueries
		? ([
				{ level: "query", emit: "event" },
				{ level: "info", emit: "event" },
			] satisfies Prisma.LogDefinition[])
		: []),
];

const createPrismaClient = () => {
	const client = new PrismaClient({
		adapter: new PrismaPg({ connectionString: connectionString() }),
		log: logDefinitions,
	});

	client.$on("error", ({ message, target }) => {
		sink({ level: "error", message, target });
	});
	client.$on("warn", ({ message, target }) => {
		sink({ level: "warn", message, target });
	});
	client.$on("info", ({ message, target }) => {
		sink({ level: "info", message, target });
	});
	client.$on("query", ({ query, duration, target }) => {
		sink({ level: "query", message: query, target, durationMs: duration });
	});

	return client;
};

let clientInstance: PrismaClient | undefined;

const getClient = (): PrismaClient => {
	clientInstance ??= createPrismaClient();
	return clientInstance;
};

declare global {
	var prisma: PrismaClient | undefined;
}

const lazyClient = new Proxy({} as PrismaClient, {
	get(_target, property, receiver) {
		const client = getClient();
		const value = Reflect.get(client as unknown as object, property, receiver);
		return typeof value === "function" ? value.bind(client) : value;
	},
	has(_target, property) {
		return property in (getClient() as unknown as object);
	},
	getPrototypeOf() {
		return PrismaClient.prototype;
	},
});

export const db: PrismaClient = globalThis.prisma ?? lazyClient;

if (process.env.NODE_ENV !== "production") {
	globalThis.prisma = db;
}

export type Db = PrismaClient;
