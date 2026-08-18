import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildCommunityPromotionPlan } from "./promotion.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function loadOfficialRules() {
  const catalog = await readJson(path.join(ROOT, "official", "catalog.json"));
  const rules = [];
  for (const entry of catalog.ruleSets || []) {
    const filename = path.basename(new URL(entry.url).pathname);
    const payload = await readJson(path.join(ROOT, "official", "rules", filename));
    rules.push(...(Array.isArray(payload) ? payload : [payload]));
  }
  return rules;
}

const entryId = process.argv[2];
const reviewPath = process.argv[3];
if (!entryId || !reviewPath) {
  console.error("Usage: node scripts/plan-community-promotion.mjs <community-entry-id> <review.json>");
  process.exit(2);
}

const catalog = await readJson(path.join(ROOT, "community", "catalog.json"));
const entry = (catalog.ruleSets || []).find((candidate) => candidate.id === entryId);
if (!entry) {
  console.error(`Unknown Community entry: ${entryId}`);
  process.exit(2);
}

const filename = path.basename(new URL(entry.url).pathname);
const payload = await readJson(path.join(ROOT, "community", "rules", filename));
const review = await readJson(path.resolve(process.cwd(), reviewPath));
const plan = buildCommunityPromotionPlan({ entry, payload, review, officialRules: await loadOfficialRules() });
process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
process.exitCode = plan.promotionReady ? 0 : 1;
