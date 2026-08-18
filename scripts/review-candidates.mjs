import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildReviewReport } from "./curation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function loadOfficialRules() {
  const catalog = await loadJson(path.join(ROOT, "official", "catalog.json"));
  const rules = [];
  for (const entry of catalog.ruleSets || []) {
    const filename = path.basename(new URL(entry.url).pathname);
    const payload = await loadJson(path.join(ROOT, "official", "rules", filename));
    if (Array.isArray(payload)) rules.push(...payload);
    else if (payload && typeof payload === "object") rules.push(payload);
  }
  return rules;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/review-candidates.mjs <candidates.json>");
  process.exit(2);
}

const raw = await loadJson(path.resolve(process.cwd(), inputPath));
const candidates = Array.isArray(raw) ? raw : raw.candidates;
if (!Array.isArray(candidates)) {
  console.error("Candidate file must be an array or an object with a candidates array.");
  process.exit(2);
}

const report = buildReviewReport(candidates, await loadOfficialRules());
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
