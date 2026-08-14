import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../catalog.json", import.meta.url), "utf8"));
if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.ruleSets)) {
    throw new Error("Invalid catalog metadata");
}

const seen = new Set();
for (const file of await readdir(new URL("../rules/", import.meta.url))) {
    if (!file.endsWith(".json")) continue;
    const text = await readFile(new URL(`../rules/${file}`, import.meta.url), "utf8");
    const rules = JSON.parse(text);
    if (!Array.isArray(rules)) throw new Error(`${file}: top-level value must be an array`);
    for (const rule of rules) {
        if (!rule.uuid || typeof rule.uuid !== "string") throw new Error(`${file}: rule without UUID`);
        if (seen.has(rule.uuid)) throw new Error(`${file}: duplicate UUID ${rule.uuid}`);
        seen.add(rule.uuid);
        if (!rule.pattern || !rule.action) throw new Error(`${file}: ${rule.uuid} lacks pattern/action`);
    }

    const entry = catalog.ruleSets.find(({ id }) => `${id}.json` === file);
    if (entry && entry.sha256) {
        const digest = createHash("sha256").update(text).digest("hex");
        if (digest !== entry.sha256) throw new Error(`${file}: sha256 mismatch in catalog.json`);
    }
}

console.log(`Validated ${catalog.ruleSets.length} catalog entries and ${seen.size} unique rules.`);
