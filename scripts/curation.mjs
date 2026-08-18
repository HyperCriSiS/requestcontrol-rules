import { getSource, SOURCE_INTEGRATION } from "./sources.mjs";

export const KIND = Object.freeze({ PARAMETER: "parameter", REDIRECT: "redirect" });
export const RISK = Object.freeze({ LOW: "low", MEDIUM: "medium", HIGH: "high", BLOCKED: "blocked" });

const PARAMETER = /^[a-z0-9_.-]+$/i;
const SENSITIVE = /(^|[_-])(auth|code|confirm|key|login|nonce|payment|redirect|return|session|signature|state|token|verify)([_-]|$)/i;
const TRACKING = /^(utm_|pk_|mc_)/i;

const text = (value) => typeof value === "string" ? value.trim() : "";
const sortedUnique = (values) => [...new Set(values.filter(Boolean))].sort();
const host = (value) => text(value).toLowerCase().replace(/^\.+|\.+$/g, "");

export function normalizeCandidate(raw = {}) {
  const kind = text(raw.kind).toLowerCase();
  return {
    sourceId: text(raw.sourceId),
    kind,
    key: text(raw.key).toLowerCase(),
    hosts: sortedUnique((Array.isArray(raw.hosts) ? raw.hosts : []).map(host)),
    wrapperParameter: kind === KIND.REDIRECT ? text(raw.wrapperParameter).toLowerCase() : "",
    notes: text(raw.notes),
  };
}

export function validateCandidate(candidate) {
  const errors = [];
  if (!getSource(candidate.sourceId)) errors.push("unknown-source");
  if (!Object.values(KIND).includes(candidate.kind)) errors.push("unknown-kind");
  if (!candidate.key) errors.push("missing-key");
  if (candidate.kind === KIND.PARAMETER && !PARAMETER.test(candidate.key || "")) errors.push("invalid-parameter-name");
  if (candidate.kind === KIND.REDIRECT && !candidate.wrapperParameter) errors.push("missing-wrapper-parameter");
  return errors;
}

export function fingerprint(candidate) {
  const value = normalizeCandidate(candidate);
  return JSON.stringify({ sourceId: value.sourceId, kind: value.kind, key: value.key, hosts: value.hosts, wrapperParameter: value.wrapperParameter });
}

export function assessRisk(candidate) {
  const value = normalizeCandidate(candidate);
  if (validateCandidate(value).length) return { risk: RISK.BLOCKED, reasons: ["invalid-candidate"] };
  const source = getSource(value.sourceId);
  const reasons = [];
  if ([SOURCE_INTEGRATION.DEFERRED, SOURCE_INTEGRATION.INSPIRATION_ONLY].includes(source.integration)) reasons.push("source-not-directly-importable");
  if (value.kind === KIND.PARAMETER) {
    if (SENSITIVE.test(value.key)) reasons.push("sensitive-parameter-name");
    if (!value.hosts.length && !TRACKING.test(value.key)) reasons.push("global-parameter-scope");
  }
  if (value.kind === KIND.REDIRECT) {
    if (!value.hosts.length) reasons.push("redirect-without-host-scope");
    if (SENSITIVE.test(value.wrapperParameter)) reasons.push("sensitive-wrapper-parameter");
  }
  if (reasons.some((reason) => reason.startsWith("source-not-") || reason.startsWith("sensitive-"))) return { risk: RISK.HIGH, reasons };
  if (reasons.length) return { risk: RISK.MEDIUM, reasons };
  return { risk: RISK.LOW, reasons: [] };
}

export function curate(candidates = []) {
  const seen = new Set();
  const accepted = [];
  const rejected = [];
  for (const raw of candidates) {
    const candidate = normalizeCandidate(raw);
    const errors = validateCandidate(candidate);
    const id = fingerprint(candidate);
    if (errors.length) { rejected.push({ candidate, reasons: errors }); continue; }
    if (seen.has(id)) { rejected.push({ candidate, reasons: ["duplicate-candidate"] }); continue; }
    seen.add(id);
    accepted.push({ candidate, fingerprint: id, assessment: assessRisk(candidate) });
  }
  return { accepted, rejected };
}

export function adaptClearUrlsFixture(entries = []) {
  return entries.flatMap((entry) => (entry.parameters || []).map((parameter) => ({
    sourceId: "clearurls-rules",
    kind: KIND.PARAMETER,
    key: parameter,
    hosts: entry.hosts || [],
    notes: entry.notes || "",
  })));
}

export function adaptFastForwardFixture(entries = []) {
  return entries.map((entry) => ({
    sourceId: "fastforward",
    kind: KIND.REDIRECT,
    key: entry.id || entry.host || "redirect",
    hosts: entry.host ? [entry.host] : (entry.hosts || []),
    wrapperParameter: entry.parameter || "",
    notes: entry.notes || "",
  }));
}

export const CONFLICT = Object.freeze({
  NONE: "none",
  DUPLICATE: "duplicate",
  NARROWER: "narrower",
  BROADER: "broader",
  CONTRADICTORY: "contradictory",
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globMatches(pattern, value) {
  const source = `^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`;
  return new RegExp(source, "i").test(value);
}

function relationForPattern(candidatePattern, officialPattern) {
  if (candidatePattern === officialPattern) return "equal";
  const candidateWildcard = candidatePattern.includes("*");
  const officialWildcard = officialPattern.includes("*");
  if (officialWildcard && !candidateWildcard && globMatches(officialPattern, candidatePattern)) return "candidate-narrower";
  if (candidateWildcard && !officialWildcard && globMatches(candidatePattern, officialPattern)) return "candidate-broader";
  return "none";
}

function ruleHosts(rule) {
  if (rule?.pattern?.allUrls) return [];
  const hosts = Array.isArray(rule?.pattern?.host) ? rule.pattern.host.map(host).filter(Boolean) : [];
  return hosts.includes("*") ? [] : sortedUnique(hosts);
}

function hostPatternCovers(pattern, value) {
  if (!pattern) return false;
  if (pattern === "*") return true;
  if (pattern === value) return true;
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return value === base || value.endsWith(`.${base}`);
  }
  return globMatches(pattern, value);
}

function scopeRelation(candidateHosts, officialHosts) {
  const candidateGlobal = candidateHosts.length === 0;
  const officialGlobal = officialHosts.length === 0;
  if (candidateGlobal && officialGlobal) return "equal";
  if (!candidateGlobal && officialGlobal) return "candidate-narrower";
  if (candidateGlobal && !officialGlobal) return "candidate-broader";

  const candidateCovered = candidateHosts.every((candidateHost) => officialHosts.some((officialHost) => hostPatternCovers(officialHost, candidateHost)));
  const officialCovered = officialHosts.every((officialHost) => candidateHosts.some((candidateHost) => hostPatternCovers(candidateHost, officialHost)));
  if (candidateCovered && officialCovered) return "equal";
  if (candidateCovered) return "candidate-narrower";
  if (officialCovered) return "candidate-broader";
  return "none";
}

function combineRelations(patternRelation, scope) {
  if (patternRelation === "none" || scope === "none") return CONFLICT.NONE;
  if (patternRelation === "equal" && scope === "equal") return CONFLICT.DUPLICATE;
  const directions = new Set([patternRelation, scope]);
  if (!directions.has("candidate-broader") && directions.has("candidate-narrower")) return CONFLICT.NARROWER;
  if (!directions.has("candidate-narrower") && directions.has("candidate-broader")) return CONFLICT.BROADER;
  return CONFLICT.NONE;
}

function pathMentionsParameter(paths, parameter) {
  const needle = String(parameter || "").toLowerCase();
  if (!needle) return false;
  return paths.some((path) => String(path).toLowerCase().includes(`${needle}=`));
}

function compareParameterCandidate(candidate, rule) {
  const scope = scopeRelation(candidate.hosts, ruleHosts(rule));
  if (scope === "none") return CONFLICT.NONE;
  const paths = Array.isArray(rule?.pattern?.path) ? rule.pattern.path : [];
  if (rule?.action === "whitelist" && pathMentionsParameter(paths, candidate.key)) {
    return CONFLICT.CONTRADICTORY;
  }
  if (rule?.action !== "filter") return CONFLICT.NONE;
  const values = Array.isArray(rule?.paramsFilter?.values) ? rule.paramsFilter.values.map((value) => text(value).toLowerCase()) : [];
  let best = CONFLICT.NONE;
  for (const value of values) {
    const relation = combineRelations(relationForPattern(candidate.key, value), scope);
    if (relation === CONFLICT.DUPLICATE) return relation;
    if (relation === CONFLICT.NARROWER) best = CONFLICT.NARROWER;
    else if (relation === CONFLICT.BROADER && best === CONFLICT.NONE) best = CONFLICT.BROADER;
  }
  return best;
}

function compareRedirectCandidate(candidate, rule) {
  const scope = scopeRelation(candidate.hosts, ruleHosts(rule));
  if (scope === "none") return CONFLICT.NONE;
  const paths = Array.isArray(rule?.pattern?.path) ? rule.pattern.path : [];
  if (!pathMentionsParameter(paths, candidate.wrapperParameter)) return CONFLICT.NONE;
  if (rule?.action === "whitelist") return CONFLICT.CONTRADICTORY;
  if (!["filter", "redirect"].includes(rule?.action)) return CONFLICT.NONE;
  if (scope === "equal") return CONFLICT.DUPLICATE;
  if (scope === "candidate-narrower") return CONFLICT.NARROWER;
  if (scope === "candidate-broader") return CONFLICT.BROADER;
  return CONFLICT.NONE;
}

export function compareCandidateToOfficial(candidate, officialRules = []) {
  const value = normalizeCandidate(candidate);
  const matches = [];
  for (const rule of officialRules) {
    const relation = value.kind === KIND.PARAMETER
      ? compareParameterCandidate(value, rule)
      : compareRedirectCandidate(value, rule);
    if (relation !== CONFLICT.NONE) {
      matches.push({ relation, uuid: rule.uuid || null, title: rule.title || "" });
    }
  }

  const priority = [CONFLICT.CONTRADICTORY, CONFLICT.DUPLICATE, CONFLICT.NARROWER, CONFLICT.BROADER];
  const relation = priority.find((item) => matches.some((match) => match.relation === item)) || CONFLICT.NONE;
  return { relation, matches };
}

function fixtureHost(candidate) {
  return candidate.hosts[0]?.replace(/^\*\./, "fixture.") || "fixture.example";
}

export function generateCandidateFixtures(candidate) {
  const value = normalizeCandidate(candidate);
  const hostname = fixtureHost(value);
  if (value.kind === KIND.PARAMETER) {
    const encodedKey = encodeURIComponent(value.key.replace("*", "sample"));
    return {
      positive: [{ url: `https://${hostname}/article?${encodedKey}=tracking-value&keep=1`, expectation: "candidate-applies" }],
      negative: [{ url: `https://${hostname}/article?keep=1`, expectation: "candidate-does-not-apply" }],
    };
  }
  const parameter = encodeURIComponent(value.wrapperParameter);
  const target = encodeURIComponent("https://destination.example/article");
  return {
    positive: [{ url: `https://${hostname}/redirect?${parameter}=${target}`, expectation: "candidate-applies" }],
    negative: [{ url: `https://${hostname}/redirect?other=${target}`, expectation: "candidate-does-not-apply" }],
  };
}

export function validateCandidateFixtures(fixtures) {
  const positive = Array.isArray(fixtures?.positive) ? fixtures.positive : [];
  const negative = Array.isArray(fixtures?.negative) ? fixtures.negative : [];
  const validEntry = (entry) => typeof entry?.url === "string" && entry.url.startsWith("https://") && typeof entry?.expectation === "string";
  return positive.length > 0 && negative.length > 0 && positive.every(validEntry) && negative.every(validEntry);
}

export function buildReviewReport(candidates = [], officialRules = []) {
  const curated = curate(candidates);
  return {
    accepted: curated.accepted.map((item) => {
      const conflict = compareCandidateToOfficial(item.candidate, officialRules);
      const fixtures = generateCandidateFixtures(item.candidate);
      return {
        ...item,
        conflict,
        fixtures,
        promotionReady: item.assessment.risk === RISK.LOW && conflict.relation === CONFLICT.NONE && validateCandidateFixtures(fixtures),
      };
    }),
    rejected: curated.rejected,
  };
}
