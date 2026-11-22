import { readFile, writeFile } from "node:fs/promises";

const outputPath = ".vercel/output/config.json";
const output = JSON.parse(await readFile(outputPath, "utf8"));

output.schedules = {
  ...(output.schedules ?? {}),
  "crm-dispatch": {
    schedule: "*/15 * * * *",
    function: "api/dispatch",
    timezone: "UTC",
  },
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
