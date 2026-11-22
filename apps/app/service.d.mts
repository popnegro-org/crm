import type { SecretString } from "@prisma/composer";
import type { PostgresBinding, PostgresContract } from "@prisma/composer-prisma-cloud/orm";
import type { Contract } from "../packages/db/src/prisma/contract";

declare const service: {
	load(): { db: PostgresBinding<PostgresContract<Contract>> };
	input(): { authSecret: SecretString };
	port(): number;
};

export default service;
