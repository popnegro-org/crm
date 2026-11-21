import { describe, expect, test } from "bun:test";
import { parseCsv, prepareOutscraperLeads, toCsv } from "./outscraper-csv";

describe("Outscraper CSV preparation", () => {
	test("parses quoted commas, escaped quotes and newlines", () => {
		const rows = parseCsv(
			'name,description\n"Estudio, Legal","Dice ""hola""\ny sigue"\n',
		);
		expect(rows).toEqual([{ name: "Estudio, Legal", description: 'Dice "hola"\ny sigue' }]);
	});

	test("normalizes, scores, filters city and caps the batch at 30", () => {
		const rows = [
			{
				name: "Estudio Uno",
				site: "https://www.estudiouno.com.ar/",
				phone: "+54 261 400 0000",
				category: "Abogados",
				city: "Mendoza",
				rating: "4.8",
				reviews: "20",
			},
			{ name: "Estudio Uno duplicado", site: "https://estudiouno.com.ar", city: "Mendoza" },
			{ name: "Negocio remoto", site: "https://remoto.com", city: "Córdoba" },
			{ name: "", city: "Mendoza" },
		];
		const result = prepareOutscraperLeads(rows, { city: "Mendoza", limit: 30 });
		expect(result.leads).toHaveLength(1);
		expect(result.leads[0]?.domain).toBe("estudiouno.com.ar");
		expect(result.leads[0]?.leadScore).toBe(80);
		expect(result.duplicates).toHaveLength(1);
		expect(result.rejected).toHaveLength(2);
	});

	test("never emits more than 30 leads", () => {
		const rows = Array.from({ length: 31 }, (_, i) => ({
			name: `Negocio ${i}`,
			site: `https://negocio${i}.com.ar`,
			city: "Mendoza",
		}));
		const result = prepareOutscraperLeads(rows, { city: "Mendoza" });
		expect(result.leads).toHaveLength(30);
		expect(result.rejected).toHaveLength(1);
	});

	test("exports stable CSV headers and escapes values", () => {
		const result = prepareOutscraperLeads([
			{ name: "Estudio, Uno", site: "estudio.com.ar", city: "Mendoza" },
		]);
		const csv = toCsv(result.leads);
		expect(csv).toContain('"Estudio, Uno"');
		expect(csv.split("\n")[0]).toContain("leadScore");
	});
});
