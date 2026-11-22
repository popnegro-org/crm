// @ts-check
import { module } from "@prisma/composer";
import { envSecret } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import appService from "./apps/app/service.mjs";
import contractJson from "./packages/db/src/prisma/contract.json" with { type: "json" };

export default module("prisma-crm", ({ provision }) => {
	const db = provision(
		postgres({
			name: "db",
			contract: dataContract(contractJson),
			config: "./packages/db/prisma.config.ts",
		}),
	);

	provision(appService, {
		deps: { db },
		input: {
			authSecret: envSecret("BETTER_AUTH_SECRET"), // Signs the session cookies the app verifies.
		},
	});
});
