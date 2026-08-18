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
