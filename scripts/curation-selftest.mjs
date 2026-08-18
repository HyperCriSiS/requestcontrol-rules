import assert from "node:assert/strict";
import { adaptClearUrlsFixture, adaptFastForwardFixture, assessRisk, curate, RISK } from "./curation.mjs";
import { validateSources } from "./sources.mjs";

assert.deepEqual(validateSources(), []);

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

console.log("Curation self-test passed.");
