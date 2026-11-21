# Outscraper lead intake (free tier)

The initial lead-generation intake uses Outscraper's manual CSV export. It deliberately does not call the Outscraper API, because API access is not included in the published free Google Maps Scraper tier.

## Free-tier workflow

1. In Outscraper, run a Google Maps search for the selected professional/service category in Mendoza, Argentina.
2. Keep the task within the provider's current free allowance (published as the first 500 businesses per 30-day billing period). Do not start an additional task if the UI indicates a charge.
3. Export the result as CSV.
4. Run from the repository root:

```sh
cd apps/api
bun run leads:prepare -- /absolute/path/to/outscraper.csv /absolute/path/to/leads-prepared.csv Mendoza
```

5. Review the JSON report and prepared CSV before importing records into the CRM.

## Processing rules

- Maximum 30 prepared businesses per run.
- Accepts common Outscraper column aliases for name, website, category, location, phone and business email.
- Normalizes domains and deduplicates by domain, then phone, then business name.
- Filters records to the requested city.
- Rejects rows without a business name and rows outside the target city.
- Produces a transparent 0–100 completeness/quality signal with reasons; it is a triage aid, not a prediction of conversion.
- Output is a review file only. It does not write to the CRM database, create contacts, send email/WhatsApp, or start follow-ups.

## Compliance and cost controls

Publicly visible business details are not evidence of consent to receive marketing. A phone number does not authorize WhatsApp outreach. Verify source terms, applicable privacy/marketing rules and any required lawful basis before outreach. Do not import named personal contacts or initiate messages through this workflow.

Official pricing: https://outscraper.com/pricing/
