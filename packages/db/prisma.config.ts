import path from "node:path";
import { defineConfig as orm } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
	orm: orm({
		contract: path.join("src", "prisma", "contract.prisma"),
		output: path.join("src", "prisma"),
		db: { connection: process.env["DATABASE_URL"] ?? "" },
	}),
});
