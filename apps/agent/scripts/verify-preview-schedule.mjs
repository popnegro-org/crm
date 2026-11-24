import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const outputRoot = ".vercel/output";
const configPath = join(outputRoot, "config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const serialized = JSON.stringify(config);

if (!serialized.includes("eve.dispatch")) {
	throw new Error("Eve did not register the expected private schedule eve.dispatch.");
}
if (!serialized.includes("*/15 * * * *")) {
	throw new Error("Eve did not register the expected 15-minute UTC cadence.");
}

async function findFunctionConfigs(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const found = [];

	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			found.push(...(await findFunctionConfigs(path)));
		} else if (entry.name === ".vc-config.json") {
			found.push(path);
		}
	}

	return found;
}

const functionConfigs = await findFunctionConfigs(join(outputRoot, "functions"));
if (functionConfigs.length === 0) {
	throw new Error("Eve Build Output contains no packaged Vercel Functions.");
}

console.log("Verified Eve Preview schedule eve.dispatch and packaged Vercel Functions.");
