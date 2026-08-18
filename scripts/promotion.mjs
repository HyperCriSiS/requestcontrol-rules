import { createHash } from "node:crypto";

export const PROMOTION_RISK = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  BLOCKED: "blocked",
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  }
  return value;
}

export function canonicalRule(rule) {
  const copy = clone(rule);
  delete copy.managed;
  delete copy.source;
  return JSON.stringify(sorted(copy));
}

export function packageDigest(payload) {
  const text = JSON.stringify(payload, null, 2) + "\n";
  return createHash("sha256").update(text).digest("hex");
}

function hasGlobalScope(rule) {
  return Boolean(rule?.pattern?.allUrls);
}

export function assessNativeRuleRisk(rule) {
  const reasons = [];
  if (!rule || typeof rule !== "object" || !rule.uuid || !rule.pattern || !rule.action) {
    return { risk: PROMOTION_RISK.BLOCKED, reasons: ["invalid-native-rule"] };
  }

  if (hasGlobalScope(rule) && ["redirect", "cancel", "whitelist"].includes(rule.action)) {
    reasons.push("global-high-impact-action");
  } else if (hasGlobalScope(rule) && rule.action === "filter") {
    reasons.push("global-filter-scope");
  }

  if (rule.action === "redirect" && typeof rule.redirect === "string" && /javascript:|data:/i.test(rule.redirect)) {
    reasons.push("non-web-redirect-target");
  }

  if (reasons.includes("non-web-redirect-target")) {
    return { risk: PROMOTION_RISK.BLOCKED, reasons };
  }
  if (reasons.includes("global-high-impact-action")) {
    return { risk: PROMOTION_RISK.HIGH, reasons };
  }
  if (reasons.length) {
    return { risk: PROMOTION_RISK.MEDIUM, reasons };
  }
  return { risk: PROMOTION_RISK.LOW, reasons: [] };
}

export function compareCommunityPackageToOfficial(communityRules = [], officialRules = []) {
  const officialByUuid = new Map(officialRules.filter((rule) => rule?.uuid).map((rule) => [rule.uuid, rule]));
  return communityRules.map((rule) => {
    const official = officialByUuid.get(rule?.uuid);
    if (!official) {
      return { uuid: rule?.uuid || null, relation: "new" };
    }
    if (canonicalRule(rule) === canonicalRule(official)) {
      return { uuid: rule.uuid, relation: "duplicate" };
    }
    return { uuid: rule.uuid, relation: "uuid-collision" };
  });
}

function validFixtureEntry(entry) {
  return Boolean(entry && typeof entry.url === "string" && /^https?:\/\//i.test(entry.url) && typeof entry.expectation === "string");
}

export function validatePromotionReview(review, ruleUuids = []) {
  const errors = [];
  if (review?.decision !== "approve") errors.push("review-not-approved");
  if (!review?.reviewer || typeof review.reviewer !== "string") errors.push("missing-reviewer");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review?.reviewedAt || "")) errors.push("invalid-review-date");
  if (!review?.rationale || typeof review.rationale !== "string") errors.push("missing-rationale");
  if (review?.provenance?.sourceCatalog !== "requestcontrol-community") errors.push("invalid-source-catalog");
  if (!review?.provenance?.sourceEntry) errors.push("missing-source-entry");

  for (const uuid of ruleUuids) {
    const fixtures = review?.fixtures?.[uuid];
    const positive = Array.isArray(fixtures?.positive) ? fixtures.positive : [];
    const negative = Array.isArray(fixtures?.negative) ? fixtures.negative : [];
    if (!positive.length || !negative.length || !positive.every(validFixtureEntry) || !negative.every(validFixtureEntry)) {
      errors.push(`missing-or-invalid-fixtures:${uuid}`);
    }
  }
  return errors;
}

function acceptedRiskKeys(review) {
  return new Set(Array.isArray(review?.acceptedRisks) ? review.acceptedRisks : []);
}

export function buildCommunityPromotionPlan({ entry, payload, review, officialRules = [] }) {
  const rules = Array.isArray(payload) ? payload : (payload && typeof payload === "object" ? [payload] : []);
  const comparison = compareCommunityPackageToOfficial(rules, officialRules);
  const newRules = rules.filter((rule) => comparison.find((item) => item.uuid === rule.uuid)?.relation === "new");
  const collisions = comparison.filter((item) => item.relation === "uuid-collision");
  const duplicates = comparison.filter((item) => item.relation === "duplicate");
  const assessments = newRules.map((rule) => ({ uuid: rule.uuid, ...assessNativeRuleRisk(rule) }));
  const acceptedRisks = acceptedRiskKeys(review);
  const unacceptedRisks = assessments.flatMap((assessment) => assessment.reasons
    .filter((reason) => !acceptedRisks.has(`${assessment.uuid}:${reason}`))
    .map((reason) => `${assessment.uuid}:${reason}`));
  const blocked = assessments.filter((assessment) => assessment.risk === PROMOTION_RISK.BLOCKED);
  const reviewErrors = validatePromotionReview(review, newRules.map((rule) => rule.uuid));
  if (review?.provenance?.sourceEntry && entry?.id && review.provenance.sourceEntry !== entry.id) {
    reviewErrors.push("source-entry-mismatch");
  }

  const promotionReady = Boolean(
    entry?.id &&
    rules.length > 0 &&
    newRules.length > 0 &&
    collisions.length === 0 &&
    blocked.length === 0 &&
    unacceptedRisks.length === 0 &&
    reviewErrors.length === 0
  );

  const provenance = {
    schemaVersion: 1,
    sourceCatalog: "requestcontrol-community",
    sourceEntry: entry?.id || null,
    sourceVersion: entry?.version || null,
    sourceUrl: entry?.url || null,
    sourceSha256: entry?.sha256 || packageDigest(payload),
    reviewer: review?.reviewer || null,
    reviewedAt: review?.reviewedAt || null,
    rationale: review?.rationale || "",
    acceptedRisks: [...acceptedRisks].sort(),
    duplicateRuleUuids: duplicates.map((item) => item.uuid),
  };

  return {
    promotionReady,
    source: {
      catalog: "requestcontrol-community",
      entry: entry?.id || null,
      version: entry?.version || null,
    },
    comparison,
    assessments,
    reviewErrors,
    unacceptedRisks,
    proposed: promotionReady ? {
      officialEntry: {
        id: entry.id,
        name: entry.name,
        description: entry.description || "",
        category: entry.category || "community-promoted",
        group: entry.group || "promoted",
        version: entry.version || "1.0.0",
        review: "maintainer-approved",
      },
      rules: newRules,
      provenance,
    } : null,
  };
}
