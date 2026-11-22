import path from "node:path";
import { defineConfig as orm } from "@prisma/orm-postgres/config";
import { defineConfig as composer } from "@prisma/composer/config";
import { nextjsBuild } from "@prisma/composer/nextjs/control";
import { nodeBuild } from "@prisma/composer/node/control";
import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
	orm: orm({
		contract: path.join("packages", "db", "src", "prisma", "contract.prisma"),
		output: path.join("packages", "db", "src", "prisma"),
		migrations: { dir: path.join("packages", "db", "migrations") },
		db: { connection: process.env["DATABASE_URL"] ?? "" },
	}),
	composer: composer({
		entry: "./module.mjs",
		extensions: [prismaCloud(), nodeBuild(), nextjsBuild()],
		state: prismaState(),
	}),
});
