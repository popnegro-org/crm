import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	parseCsv,
	prepareOutscraperLeads,
	toCsv,
} from "../src/companies/outscraper-csv";

const [
	inputArg,
	outputArg = "outscraper-leads-prepared.csv",
	cityArg = "Mendoza",
] = Bun.argv.slice(2);
if (!inputArg) {
	console.error("Uso: bun run leads:prepare -- <entrada.csv> [salida.csv] [ciudad]");
	process.exit(1);
}

try {
	const input = await readFile(resolve(inputArg), "utf8");
	const rows = parseCsv(input);
	const result = prepareOutscraperLeads(rows, { city: cityArg, limit: 30 });
	await writeFile(resolve(outputArg), toCsv(result.leads), "utf8");
	const report = {
		inputRows: rows.length,
		prepared: result.leads.length,
		rejected: result.rejected.length,
		duplicates: result.duplicates.length,
		output: resolve(outputArg),
		rejectedRows: result.rejected,
		duplicateRows: result.duplicates,
	};
	console.log(JSON.stringify(report, null, 2));
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
