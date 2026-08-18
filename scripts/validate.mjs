import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function validateCatalog(catalogPath, rulesPath, expectedChannel) {
  const catalog = await readJson(catalogPath);
  if (catalog.schemaVersion !== 3 || catalog.channel !== expectedChannel || !catalog.catalog || !Array.isArray(catalog.ruleSets)) {
    throw new Error(`${expectedChannel}: invalid catalog metadata`);
  }
  const ids = new Set();
  const uuids = new Set();
  const files = new Set((await readdir(rulesPath, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => entry.name));

  for (const entry of catalog.ruleSets) {
    if (!entry.id || ids.has(entry.id)) throw new Error(`${expectedChannel}: duplicate/missing catalog id`);
    ids.add(entry.id);
    if (!entry.name || !entry.version || !entry.url || !entry.sha256) throw new Error(`${expectedChannel}/${entry.id}: incomplete metadata`);
    if (["legacySources", "legacySourceIds", "legacyPaths"].some((key) => key in entry)) throw new Error(`${expectedChannel}/${entry.id}: legacy source metadata is not allowed`);
    const file = `${entry.id}.json`;
    if (!files.has(file)) throw new Error(`${expectedChannel}/${entry.id}: missing ${file}`);
    const text = await readFile(new URL(file, rulesPath), "utf8");
    const digest = createHash("sha256").update(text).digest("hex");
    if (digest !== entry.sha256) throw new Error(`${expectedChannel}/${entry.id}: sha256 mismatch`);
    const parsed = JSON.parse(text);
    const rules = Array.isArray(parsed) ? parsed : [parsed];
    if (!rules.length || rules.some((rule) => !rule || typeof rule !== "object")) throw new Error(`${expectedChannel}/${entry.id}: invalid rule payload`);
    for (const rule of rules) {
      if (!rule.uuid || typeof rule.uuid !== "string") throw new Error(`${expectedChannel}/${entry.id}: rule without UUID`);
      if (uuids.has(rule.uuid)) throw new Error(`${expectedChannel}: duplicate UUID ${rule.uuid}`);
      uuids.add(rule.uuid);
      if (!rule.pattern || !rule.action) throw new Error(`${expectedChannel}/${entry.id}: ${rule.uuid} lacks pattern/action`);
    }
  }

  for (const file of files) {
    if (!ids.has(file.replace(/\.json$/, ""))) throw new Error(`${expectedChannel}: unlisted rule file ${file}`);
  }
  return { entries: ids.size, rules: uuids.size };
}

const official = await validateCatalog(new URL("../official/catalog.json", import.meta.url), new URL("../official/rules/", import.meta.url), "official");
const community = await validateCatalog(new URL("../community/catalog.json", import.meta.url), new URL("../community/rules/", import.meta.url), "community");
console.log(`Validated official: ${official.entries} packages/${official.rules} rules; community: ${community.entries} packages/${community.rules} rules.`);
