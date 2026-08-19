import assert from "node:assert/strict";
import {
  CONFLICT,
  RISK,
  adaptClearUrlsFixture,
  adaptFastForwardFixture,
  assessRisk,
  buildReviewReport,
  compareCandidateToOfficial,
  curate,
  generateCandidateFixtures,
  validateCandidateFixtures,
} from "./curation.mjs";
import { ADAPTER_STATUS, getActiveAdapterSources, getSource, validateSources } from "./sources.mjs";

assert.deepEqual(validateSources(), []);
assert.deepEqual(getActiveAdapterSources().map((source) => source.id).sort(), ["clearurls-rules", "fastforward"]);
assert.equal(getSource("legitimate-url-shortener").adapterStatus, ADAPTER_STATUS.DEFERRED);
assert.match(getSource("legitimate-url-shortener").adapterNotes, /provenance/i);

const clear = adaptClearUrlsFixture([{ hosts: ["Example.COM", "example.com"], parameters: ["utm_source", "session_token"] }]);
const report = curate(clear);
assert.equal(report.accepted.length, 2);
assert.equal(report.accepted[0].candidate.hosts[0], "example.com");
assert.equal(assessRisk(report.accepted[0].candidate).risk, RISK.LOW);
assert.equal(assessRisk(report.accepted[1].candidate).risk, RISK.HIGH);

const ff = adaptFastForwardFixture([{ id: "wrapper", host: "go.example", parameter: "url" }]);
assert.equal(curate(ff).accepted.length, 1);
assert.equal(assessRisk(ff[0]).risk, RISK.LOW);

const duplicates = curate([clear[0], { ...clear[0], key: "UTM_SOURCE" }]);
assert.equal(duplicates.accepted.length, 1);
assert.deepEqual(duplicates.rejected[0].reasons, ["duplicate-candidate"]);

const officialParameterRule = {
  uuid: "official-param",
  title: "Official tracking cleanup",
  pattern: { allUrls: true },
  action: "filter",
  paramsFilter: { values: ["fbclid", "utm_*"] },
};
assert.equal(compareCandidateToOfficial({ sourceId: "clearurls-rules", kind: "parameter", key: "fbclid" }, [officialParameterRule]).relation, CONFLICT.DUPLICATE);
assert.equal(compareCandidateToOfficial({ sourceId: "clearurls-rules", kind: "parameter", key: "utm_source" }, [officialParameterRule]).relation, CONFLICT.NARROWER);
assert.equal(compareCandidateToOfficial({ sourceId: "clearurls-rules", kind: "parameter", key: "fbclid", hosts: ["news.example"] }, [officialParameterRule]).relation, CONFLICT.NARROWER);

const scopedOfficial = {
  uuid: "official-scoped",
  pattern: { host: ["news.example"] },
  action: "filter",
  paramsFilter: { values: ["campaign_id"] },
};
assert.equal(compareCandidateToOfficial({ sourceId: "clearurls-rules", kind: "parameter", key: "campaign_id" }, [scopedOfficial]).relation, CONFLICT.BROADER);

const whitelist = {
  uuid: "official-whitelist",
  pattern: { allUrls: true, path: ["*/continue?token=*"] },
  action: "whitelist",
};
assert.equal(compareCandidateToOfficial({ sourceId: "clearurls-rules", kind: "parameter", key: "token" }, [whitelist]).relation, CONFLICT.CONTRADICTORY);

const redirectRule = {
  uuid: "official-redirect",
  pattern: { host: ["go.example"], path: ["/out?url=*"] },
  action: "redirect",
};
assert.equal(compareCandidateToOfficial(ff[0], [redirectRule]).relation, CONFLICT.DUPLICATE);

const fixtures = generateCandidateFixtures({ sourceId: "clearurls-rules", kind: "parameter", key: "gclid" });
assert.equal(validateCandidateFixtures(fixtures), true);
assert.equal(fixtures.positive.length > 0 && fixtures.negative.length > 0, true);

const review = buildReviewReport([
  { sourceId: "clearurls-rules", kind: "parameter", key: "fbclid" },
  { sourceId: "clearurls-rules", kind: "parameter", key: "new_tracking_id", hosts: ["metrics.example"] },
], [officialParameterRule]);
assert.equal(review.accepted[0].conflict.relation, CONFLICT.DUPLICATE);
assert.equal(review.accepted[0].promotionReady, false);
assert.equal(review.accepted[1].conflict.relation, CONFLICT.NONE);
assert.equal(review.accepted[1].promotionReady, true);

console.log("Curation self-test passed.");
