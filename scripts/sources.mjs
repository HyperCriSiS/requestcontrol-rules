export const SOURCE_INTEGRATION = Object.freeze({
  BUNDLE_ELIGIBLE: "bundle-eligible",
  REVIEW_ONLY: "review-only",
  INSPIRATION_ONLY: "inspiration-only",
  DEFERRED: "deferred",
});

const SOURCES = Object.freeze([
  { id: "evo-native", name: "Request Control Evo curated rules", license: "MPL-2.0", integration: SOURCE_INTEGRATION.BUNDLE_ELIGIBLE },
  { id: "clearurls-rules", name: "ClearURLs Rules", license: "LGPL-3.0", integration: SOURCE_INTEGRATION.REVIEW_ONLY },
  { id: "legitimate-url-shortener", name: "Actually Legitimate URL Shortener Tool", license: "Dandelicence", integration: SOURCE_INTEGRATION.REVIEW_ONLY },
  { id: "redirector", name: "Redirector", license: "MIT", integration: SOURCE_INTEGRATION.INSPIRATION_ONLY },
  { id: "fastforward", name: "FastForward", license: "Unlicense", integration: SOURCE_INTEGRATION.REVIEW_ONLY },
  { id: "ghostery-trackerdb", name: "Ghostery Tracker Database", license: "CC-BY-NC-SA-4.0", integration: SOURCE_INTEGRATION.DEFERRED },
  { id: "privacy-badger", name: "Privacy Badger", license: "GPL-3.0", integration: SOURCE_INTEGRATION.INSPIRATION_ONLY },
  { id: "localcdn", name: "LocalCDN", license: "MPL-2.0", integration: SOURCE_INTEGRATION.DEFERRED },
]);

export function getSource(id) {
  const source = SOURCES.find((item) => item.id === id);
  return source ? { ...source } : null;
}

export function getSources() {
  return SOURCES.map((source) => ({ ...source }));
}

export function validateSources() {
  const errors = [];
  const ids = new Set();
  const integrations = new Set(Object.values(SOURCE_INTEGRATION));
  for (const source of SOURCES) {
    if (!source.id || ids.has(source.id)) errors.push(`${source.id || "<missing>"}: duplicate-or-missing-id`);
    ids.add(source.id);
    if (!source.name || !source.license) errors.push(`${source.id}: missing-attribution`);
    if (!integrations.has(source.integration)) errors.push(`${source.id}: invalid-integration`);
  }
  return errors;
}
