// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import { z } from "zod";
import { secretString } from "@prisma/composer/zod";
import contractJson from "../../packages/db/src/prisma/contract.json" with { type: "json" };

const contract = dataContract(contractJson);

export default compute({
	name: "app",
	deps: { db: postgres(contract) },
	input: z.object({
		authSecret: secretString(),
	}),
	build: nextjs({ module: import.meta.url, appDir: "." }),
});
