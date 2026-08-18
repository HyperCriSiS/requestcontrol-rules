import assert from "node:assert/strict";

import {
  PROMOTION_RISK,
  assessNativeRuleRisk,
  buildCommunityPromotionPlan,
  compareCommunityPackageToOfficial,
} from "./promotion.mjs";

const baseRule = {
  uuid: "community-safe-rule",
  title: "Community safe rule",
  pattern: { host: ["example.com"] },
  action: "filter",
  paramsFilter: { values: ["tracking_id"] },
};

const entry = {
  id: "community-sample",
  name: "Community sample",
  description: "Synthetic promotion workflow fixture",
  category: "privacy",
  group: "tracking-parameters",
  version: "1.0.0",
  url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/community/rules/community-sample.json",
  sha256: "a".repeat(64),
};

const review = {
  decision: "approve",
  reviewer: "maintainer",
  reviewedAt: "2026-08-19",
  rationale: "Synthetic workflow regression fixture.",
  provenance: {
    sourceCatalog: "requestcontrol-community",
    sourceEntry: "community-sample",
  },
  acceptedRisks: [],
  fixtures: {
    "community-safe-rule": {
      positive: [{ url: "https://example.com/?tracking_id=1", expectation: "parameter removed" }],
      negative: [{ url: "https://example.com/?keep=1", expectation: "URL unchanged" }],
    },
  },
};

assert.equal(assessNativeRuleRisk(baseRule).risk, PROMOTION_RISK.LOW);
assert.deepEqual(compareCommunityPackageToOfficial([baseRule], []), [{ uuid: baseRule.uuid, relation: "new" }]);

const ready = buildCommunityPromotionPlan({ entry, payload: [baseRule], review, officialRules: [] });
assert.equal(ready.promotionReady, true);
assert.equal(ready.proposed.rules.length, 1);
assert.equal(ready.proposed.provenance.sourceEntry, entry.id);

const duplicate = buildCommunityPromotionPlan({ entry, payload: [baseRule], review, officialRules: [baseRule] });
assert.equal(duplicate.promotionReady, false);
assert.equal(duplicate.comparison[0].relation, "duplicate");

const collisionRule = { ...baseRule, paramsFilter: { values: ["different"] } };
const collision = buildCommunityPromotionPlan({ entry, payload: [baseRule], review, officialRules: [collisionRule] });
assert.equal(collision.promotionReady, false);
assert.equal(collision.comparison[0].relation, "uuid-collision");

const broadRule = {
  uuid: "community-global-rule",
  pattern: { allUrls: true },
  action: "redirect",
  redirect: "https://example.com/",
};
const broadReview = {
  ...review,
  fixtures: {
    "community-global-rule": {
      positive: [{ url: "https://source.example/", expectation: "redirect" }],
      negative: [{ url: "https://safe.example/", expectation: "no redirect" }],
    },
  },
};
const broadBlocked = buildCommunityPromotionPlan({ entry, payload: [broadRule], review: broadReview, officialRules: [] });
assert.equal(broadBlocked.promotionReady, false);
assert.deepEqual(broadBlocked.unacceptedRisks, ["community-global-rule:global-high-impact-action"]);

const broadAccepted = buildCommunityPromotionPlan({
  entry,
  payload: [broadRule],
  review: { ...broadReview, acceptedRisks: ["community-global-rule:global-high-impact-action"] },
  officialRules: [],
});
assert.equal(broadAccepted.promotionReady, true);

const missingFixtures = buildCommunityPromotionPlan({
  entry,
  payload: [baseRule],
  review: { ...review, fixtures: {} },
  officialRules: [],
});
assert.equal(missingFixtures.promotionReady, false);
assert.ok(missingFixtures.reviewErrors.includes("missing-or-invalid-fixtures:community-safe-rule"));

console.log("Community promotion self-test passed.");
