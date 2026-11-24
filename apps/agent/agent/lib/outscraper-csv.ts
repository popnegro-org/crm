export type OutscraperRow = Record<string, string>;
export type PreparedLead = {
	name: string;
	domain: string;
	website: string;
	industry: string;
	city: string;
	stateCode: string;
	country: string;
	countryCode: string;
	phone: string;
	email: string;
	description: string;
	source: "IMPORT";
	leadScore: number;
	scoreReasons: string[];
};

export type PreparationResult = {
	leads: PreparedLead[];
	rejected: Array<{ row: number; reason: string }>;
	duplicates: Array<{ row: number; key: string }>;
};

const aliases = {
	name: ["name", "business_name", "company", "title"],
	website: ["site", "website", "url", "website_url"],
	industry: ["category", "type", "industry"],
	city: ["city", "locality"],
	stateCode: ["state", "state_code", "province"],
	country: ["country"],
	countryCode: ["country_code", "countrycode"],
	phone: ["phone", "phone_1", "phone_number"],
	email: ["email", "email_1", "business_email"],
	description: ["description", "about"],
	rating: ["rating", "reviews_rating"],
	reviews: ["reviews", "reviews_count", "review_count"],
	address: ["full_address", "address", "street"],
} satisfies Record<string, readonly string[]>;

const aliasMap = new Map(Object.entries(aliases));

function value(row: OutscraperRow, field: string): string {
	for (const key of aliasMap.get(field) ?? [field]) {
		const found = Object.entries(row).find(
			([header]) => header.trim().toLowerCase() === key,
		);
		if (found?.[1]?.trim()) return found[1].trim();
	}
	return "";
}

function normalizeDomain(input: string): string {
	const trimmed = input.trim().toLowerCase();
	if (!trimmed) return "";
	try {
		const candidate = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed)
			? trimmed
			: `https://${trimmed}`;
		const url = new URL(candidate);
		const host = url.hostname.replace(/^www\./, "");
		return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : "";
	} catch {
		return "";
	}
}

export function parseCsv(input: string): OutscraperRow[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;
	for (let i = 0; i < input.length; i++) {
		const char = input.charAt(i);
		if (char === '"') {
			if (quoted && input.charAt(i + 1) === '"') {
				cell += '"';
				i++;
			} else {
				quoted = !quoted;
			}
		} else if (char === "," && !quoted) {
			row.push(cell);
			cell = "";
		} else if ((char === "\n" || char === "\r") && !quoted) {
			if (char === "\r" && input.charAt(i + 1) === "\n") i++;
			row.push(cell);
			if (row.some((part) => part.trim())) rows.push(row);
			row = [];
			cell = "";
		} else {
			cell += char;
		}
	}
	if (quoted) {
		throw new Error("CSV inválido: hay un campo entrecomillado sin cerrar.");
	}
	row.push(cell);
	if (row.some((part) => part.trim())) rows.push(row);
	if (rows.length < 2) return [];
	const headerRow = rows[0];
	if (!headerRow) return [];
	const headers = headerRow.map((header) =>
		header
			.replace(/^\uFEFF/, "")
			.trim()
			.toLowerCase(),
	);
	if (headers.some((header) => !header)) {
		throw new Error("CSV inválido: hay encabezados vacíos.");
	}
	return rows
		.slice(1)
		.map((cells) =>
			Object.fromEntries(
				headers.map((header, index) => [header, cells[index] ?? ""]),
			),
		);
}

interface LeadScore {
	score: number;
	reasons: string[];
}

function scoreLead(row: OutscraperRow, domain: string): LeadScore {
	const reasons: string[] = [];
	let score = 0;
	if (domain) {
		score += 25;
		reasons.push("sitio web");
	}
	if (value(row, "phone")) {
		score += 20;
		reasons.push("teléfono");
	}
	if (value(row, "email")) {
		score += 20;
		reasons.push("email comercial");
	}
	if (value(row, "industry")) {
		score += 15;
		reasons.push("categoría");
	}
	if (value(row, "city") || value(row, "address")) {
		score += 10;
		reasons.push("ubicación");
	}
	const rating = Number(value(row, "rating").replace(",", "."));
	const reviews = Number(value(row, "reviews").replace(/[^0-9]/g, ""));
	if (
		Number.isFinite(rating) &&
		rating >= 4 &&
		Number.isFinite(reviews) &&
		reviews >= 5
	) {
		score += 10;
		reasons.push("señales públicas de reputación");
	}
	return { score, reasons };
}

function identityKeys(row: OutscraperRow, domain: string): string[] {
	const phone = value(row, "phone").replace(/\D/g, "");
	const strongKeys = [
		...(domain ? [`domain:${domain}`] : []),
		...(phone ? [`phone:${phone}`] : []),
	];
	if (strongKeys.length > 0) return strongKeys;

	const name = value(row, "name")
		.toLocaleLowerCase("es")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]/g, "");
	return name ? [`name:${name}`] : [];
}

export function prepareOutscraperLeads(
	rows: OutscraperRow[],
	options: { city?: string; limit?: number } = {},
): PreparationResult {
	const limit = Math.min(30, Math.max(1, Math.floor(options.limit ?? 30)));
	const targetCity = options.city?.trim().toLocaleLowerCase("es") ?? "";
	const leads: PreparedLead[] = [];
	const rejected: PreparationResult["rejected"] = [];
	const duplicates: PreparationResult["duplicates"] = [];
	const seen = new Set<string>();

	rows.forEach((row, index) => {
		const name = value(row, "name");
		if (!name) {
			rejected.push({ row: index + 2, reason: "Falta el nombre del negocio." });
			return;
		}
		const city = value(row, "city") || value(row, "address");
		if (targetCity && !city.toLocaleLowerCase("es").includes(targetCity)) {
			rejected.push({ row: index + 2, reason: "Fuera de la ciudad objetivo." });
			return;
		}
		const websiteRaw = value(row, "website");
		const domain = normalizeDomain(websiteRaw);
		const keys = identityKeys(row, domain);
		const duplicateKey = keys.find((key) => seen.has(key));
		if (duplicateKey) {
			duplicates.push({ row: index + 2, key: duplicateKey });
			for (const key of keys) seen.add(key);
			return;
		}
		if (leads.length >= limit) {
			rejected.push({
				row: index + 2,
				reason: `Supera el límite de ${limit} prospectos.`,
			});
			return;
		}
		for (const key of keys) seen.add(key);
		const scored = scoreLead(row, domain);
		leads.push({
			name,
			domain,
			website: domain ? `https://${domain}` : "",
			industry: value(row, "industry"),
			city: value(row, "city"),
			stateCode: value(row, "stateCode"),
			country: value(row, "country") || "Argentina",
			countryCode: value(row, "countryCode") || "AR",
			phone: value(row, "phone"),
			email: value(row, "email"),
			description: value(row, "description"),
			source: "IMPORT",
			leadScore: scored.score,
			scoreReasons: scored.reasons,
		});
	});
	return { leads, rejected, duplicates };
}

export function toCsv(leads: PreparedLead[]): string {
	const headers: Array<keyof PreparedLead> = [
		"name",
		"domain",
		"website",
		"industry",
		"city",
		"stateCode",
		"country",
		"countryCode",
		"phone",
		"email",
		"description",
		"source",
		"leadScore",
		"scoreReasons",
	];
	const escapeCsvCell = (input: string | number | string[]) => {
		const text = Array.isArray(input) ? input.join("; ") : String(input);
		const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
		return /[",\r\n]/.test(safeText)
			? `"${safeText.replace(/"/g, '""')}"`
			: safeText;
	};
	return [
		headers.join(","),
		...leads.map((lead) =>
			headers.map((header) => escapeCsvCell(lead[header])).join(","),
		),
	].join("\n");
}
