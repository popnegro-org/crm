import "@crm/env/load";

import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Client generation only reads the schema and never opens a database connection.
// Keep install/build steps independent from runtime database credentials.
const isClientGeneration = process.argv.some((argument) => argument === "generate");
const datasourceUrl =
	process.env.DATABASE_URL ??
	(isClientGeneration
		? "postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate"
		: undefined);

export default defineConfig({
	schema: path.join("prisma", "schema.prisma"),
	migrations: {
		path: path.join("prisma", "migrations"),
		seed: "bun run prisma/seed.ts",
	},
	datasource: {
		url: datasourceUrl ?? env("DATABASE_URL"),
	},
});
