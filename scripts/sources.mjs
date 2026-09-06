export const SOURCE_INTEGRATION = Object.freeze({
  BUNDLE_ELIGIBLE: "bundle-eligible",
  REVIEW_ONLY: "review-only",
  INSPIRATION_ONLY: "inspiration-only",
  DEFERRED: "deferred",
});

export const ADAPTER_STATUS = Object.freeze({
  ACTIVE: "active",
  DEFERRED: "deferred",
  NOT_APPLICABLE: "not-applicable",
});

export const PROVENANCE_REQUIREMENT = Object.freeze({
  NONE: "none",
  SOURCE_LEVEL: "source-level",
  ENTRY_LEVEL: "entry-level",
});

const SOURCES = Object.freeze([
  {
    id: "evo-native",
    name: "Request Control Evo curated rules",
    license: "MPL-2.0",
    integration: SOURCE_INTEGRATION.BUNDLE_ELIGIBLE,
    adapterStatus: ADAPTER_STATUS.NOT_APPLICABLE,
    adapterNotes: "Native Evo rules do not require an external-source adapter.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.NONE,
    licenseReviewRequired: false,
  },
  {
    id: "clearurls-rules",
    name: "ClearURLs Rules",
    license: "LGPL-3.0",
    integration: SOURCE_INTEGRATION.REVIEW_ONLY,
    adapterStatus: ADAPTER_STATUS.ACTIVE,
    adapterNotes: "The offline adapter accepts only reviewed parameter candidates and never executes the upstream format.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: false,
  },
  {
    id: "legitimate-url-shortener",
    name: "Actually Legitimate URL Shortener Tool",
    license: "Dandelicence / mixed per-entry provenance",
    integration: SOURCE_INTEGRATION.REVIEW_ONLY,
    adapterStatus: ADAPTER_STATUS.DEFERRED,
    adapterNotes: "The upstream list contains mixed per-entry provenance plus regex, domain-exception and path-sensitive removeparam syntax. Require line-level provenance and deterministic semantics before adding an adapter.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.ENTRY_LEVEL,
    licenseReviewRequired: true,
  },
  {
    id: "adguard-url-tracking",
    name: "AdGuard URL Tracking filter",
    license: "GPL-3.0",
    integration: SOURCE_INTEGRATION.DEFERRED,
    adapterStatus: ADAPTER_STATUS.DEFERRED,
    adapterNotes: "A large deterministic removeparam subset exists, but the upstream allowlist carries domain/path/content-type exceptions and GPL-3.0 provenance requires an explicit license review before any lossless adapter or promotion path is enabled.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: true,
  },
  {
    id: "redirector",
    name: "Redirector",
    license: "MIT",
    integration: SOURCE_INTEGRATION.INSPIRATION_ONLY,
    adapterStatus: ADAPTER_STATUS.NOT_APPLICABLE,
    adapterNotes: "User-authored redirect recipes are an inspiration source, not a canonical static rule corpus.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: false,
  },
  {
    id: "fastforward",
    name: "FastForward",
    license: "Unlicense",
    integration: SOURCE_INTEGRATION.REVIEW_ONLY,
    adapterStatus: ADAPTER_STATUS.ACTIVE,
    adapterNotes: "The offline adapter accepts only deterministic URL-only redirect candidates with explicit wrapper parameters.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: false,
  },
  {
    id: "ghostery-trackerdb",
    name: "Ghostery Tracker Database",
    license: "CC-BY-NC-SA-4.0",
    integration: SOURCE_INTEGRATION.DEFERRED,
    adapterStatus: ADAPTER_STATUS.DEFERRED,
    adapterNotes: "Licensing and data-model fit require a separate review before any candidate adapter is justified.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: true,
  },
  {
    id: "privacy-badger",
    name: "Privacy Badger",
    license: "GPL-3.0",
    integration: SOURCE_INTEGRATION.INSPIRATION_ONLY,
    adapterStatus: ADAPTER_STATUS.NOT_APPLICABLE,
    adapterNotes: "Behavioral/privacy heuristics are not treated as a deterministic native-rule feed.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: true,
  },
  {
    id: "localcdn",
    name: "LocalCDN",
    license: "MPL-2.0",
    integration: SOURCE_INTEGRATION.DEFERRED,
    adapterStatus: ADAPTER_STATUS.DEFERRED,
    adapterNotes: "Local resource replacement is outside the current URL-rule curation scope.",
    provenanceRequirement: PROVENANCE_REQUIREMENT.SOURCE_LEVEL,
    licenseReviewRequired: false,
  },
]);

export function getSource(id) {
  const source = SOURCES.find((item) => item.id === id);
  return source ? { ...source } : null;
}

export function getSources() {
  return SOURCES.map((source) => ({ ...source }));
}

export function getActiveAdapterSources() {
  return SOURCES.filter((source) => source.adapterStatus === ADAPTER_STATUS.ACTIVE).map((source) => ({ ...source }));
}

export function validateSources() {
  const errors = [];
  const ids = new Set();
  const integrations = new Set(Object.values(SOURCE_INTEGRATION));
  const adapterStatuses = new Set(Object.values(ADAPTER_STATUS));
  const provenanceRequirements = new Set(Object.values(PROVENANCE_REQUIREMENT));
  for (const source of SOURCES) {
    if (!source.id || ids.has(source.id)) errors.push(`${source.id || "<missing>"}: duplicate-or-missing-id`);
    ids.add(source.id);
    if (!source.name || !source.license) errors.push(`${source.id}: missing-attribution`);
    if (!integrations.has(source.integration)) errors.push(`${source.id}: invalid-integration`);
    if (!adapterStatuses.has(source.adapterStatus)) errors.push(`${source.id}: invalid-adapter-status`);
    if (!source.adapterNotes) errors.push(`${source.id}: missing-adapter-notes`);
    if (!provenanceRequirements.has(source.provenanceRequirement)) errors.push(`${source.id}: invalid-provenance-requirement`);
    if (typeof source.licenseReviewRequired !== "boolean") errors.push(`${source.id}: invalid-license-review-policy`);
    if (source.adapterStatus === ADAPTER_STATUS.ACTIVE && source.integration !== SOURCE_INTEGRATION.REVIEW_ONLY) {
      errors.push(`${source.id}: active-adapter-must-be-review-only`);
    }
  }
  return errors;
}
