import fs from "node:fs";
import path from "node:path";
import { SOURCE_INTEGRATION, SOURCE_REGISTRY } from "./sources.mjs";

export const KIND = Object.freeze({
  PARAMETER: "query-parameter",
  REDIRECT: "redirect-wrapper",
});

export const CONFLICT = Object.freeze({
  NONE: "none",
  DUPLICATE: "duplicate",
  NARROWER: "narrower",
  BROADER: "broader",
  CONTRADICTORY: "contradictory",
});

const SUPPORTED_KINDS = new Set(Object.values(KIND));

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeList(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeString)
    .filter(Boolean))]
    .sort();
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCandidate(raw) {
  const candidate = raw && typeof raw === "object" ? raw : {};
  const sourceId = normalizeString(candidate.sourceId);
  const kind = normalizeString(candidate.kind);
  if (!sourceId || !SOURCE_REGISTRY[sourceId]) {
    throw new Error(`Unknown sourceId: ${sourceId || "<missing>"}`);
  }
  if (!SUPPORTED_KINDS.has(kind)) {
    throw new Error(`Unsupported candidate kind: ${kind || "<missing>"}`);
  }

  const normalized = {
    sourceId,
    kind,
    title: normalizeString(candidate.title),
    description: normalizeString(candidate.description),
    hosts: normalizeList(candidate.hosts),
    enabled: normalizeBoolean(candidate.enabled, false),
    evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
  };

  if (kind === KIND.PARAMETER) {
    normalized.key = normalizeString(candidate.key);
    normalized.remove = normalizeBoolean(candidate.remove, true);
    if (!normalized.key) {
      throw new Error("Query-parameter candidate requires key");
    }
  }

  if (kind === KIND.REDIRECT) {
    normalized.wrapperParameter = normalizeString(candidate.wrapperParameter);
    normalized.targetScheme = normalizeString(candidate.targetScheme) || "https";
    if (!normalized.wrapperParameter) {
      throw new Error("Redirect candidate requires wrapperParameter");
    }
  }

  return normalized;
}

function wildcardToRegex(pattern) {
  const escaped = String(pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function matchesPattern(pattern, value) {
  if (!pattern || !value) {
    return false;
  }
  return wildcardToRegex(pattern).test(value);
}

function hostRelation(candidateHosts, ruleHosts) {
  if (!candidateHosts.length && !ruleHosts.length) {
    return "equal";
  }
  if (!candidateHosts.length) {
    return "broader";
  }
  if (!ruleHosts.length) {
    return "narrower";
  }

  const candidateCoveredByRule = candidateHosts.every((candidateHost) =>
    ruleHosts.some((ruleHost) => matchesPattern(ruleHost, candidateHost)));
  const ruleCoveredByCandidate = ruleHosts.every((ruleHost) =>
    candidateHosts.some((candidateHost) => matchesPattern(candidateHost, ruleHost)));

  if (candidateCoveredByRule && ruleCoveredByCandidate) {
    return "equal";
  }
  if (candidateCoveredByRule) {
    return "narrower";
  }
  if (ruleCoveredByCandidate) {
    return "broader";
  }
  return "disjoint";
}

function candidateRuleRelation(candidate, rule) {
  const filter = rule?.filter || {};
  const hostScope = normalizeList(filter.host || filter.hosts || []);
  const hostState = hostRelation(candidate.hosts, hostScope);
  if (hostState === "disjoint") {
    return null;
  }

  if (candidate.kind === KIND.PARAMETER) {
    const actions = Array.isArray(rule?.action) ? rule.action : [];
    const removeQuery = actions.find((action) => action?.type === "remove-query-parameters");
    const addQuery = actions.find((action) => action?.type === "add-query-parameters");
    const removeKeys = normalizeList(removeQuery?.value || removeQuery?.parameters || []);
    const addEntries = Array.isArray(addQuery?.value) ? addQuery.value : [];
    const removesCandidate = removeKeys.some((key) => matchesPattern(key, candidate.key));
    const addsCandidate = addEntries.some((entry) => entry?.name && matchesPattern(entry.name, candidate.key));

    if (removesCandidate && addsCandidate) {
      return CONFLICT.CONTRADICTORY;
    }
    if (!removesCandidate) {
      return null;
    }
    if (hostState === "equal" && removeKeys.some((key) => key.toLowerCase() === candidate.key.toLowerCase())) {
      return CONFLICT.DUPLICATE;
    }
    return hostState === "narrower" ? CONFLICT.NARROWER : CONFLICT.BROADER;
  }

  if (candidate.kind === KIND.REDIRECT) {
    const actions = Array.isArray(rule?.action) ? rule.action : [];
    const redirects = actions.filter((action) => action?.type === "redirect");
    if (!redirects.length) {
      return null;
    }
    const parameterMatch = redirects.some((action) =>
      normalizeString(action?.value?.parameter || action?.parameter) === candidate.wrapperParameter);
    if (!parameterMatch) {
      return null;
    }
    if (hostState === "equal") {
      return CONFLICT.DUPLICATE;
    }
    return hostState === "narrower" ? CONFLICT.NARROWER : CONFLICT.BROADER;
  }

  return null;
}

function walkJsonFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const stack = [root];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

export function loadOfficialRules(root = process.cwd()) {
  const rules = [];
  for (const file of walkJsonFiles(path.join(root, "official", "rules"))) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const fileRules = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rules) ? parsed.rules : [];
    for (const rule of fileRules) {
      rules.push({ ...rule, __file: path.relative(root, file) });
    }
  }
  return rules;
}

export function assessCandidate(candidate, officialRules = []) {
  const value = normalizeCandidate(candidate);
  const source = SOURCE_REGISTRY[value.sourceId];
  const matches = [];
  for (const rule of officialRules) {
    const relation = candidateRuleRelation(value, rule);
    if (relation) {
      matches.push({ relation, uuid: rule.uuid || null, title: rule.title || "" });
    }
  }

  const priority = [CONFLICT.CONTRADICTORY, CONFLICT.DUPLICATE, CONFLICT.NARROWER, CONFLICT.BROADER];
  const relation = priority.find((item) => matches.some((match) => match.relation === item)) || CONFLICT.NONE;
  return {
    candidate: value,
    source: {
      id: source.id,
      integration: source.integration,
      license: source.license,
      runtimeDefault: Boolean(source.runtimeDefault),
    },
    conflict: { relation, matches },
    reviewRequired: source.integration !== SOURCE_INTEGRATION.BUNDLED_NATIVE || relation !== CONFLICT.NONE,
    eligibleForDirectPromotion: source.integration === SOURCE_INTEGRATION.BUNDLED_NATIVE && relation === CONFLICT.NONE,
  };
}

function fixtureHost(candidate) {
  return candidate.hosts[0]?.replace(/^\*\./, "fixture.") || "fixture.example";
}

export function generateCandidateFixtures(candidate) {
  const value = normalizeCandidate(candidate);
  const hostname = fixtureHost(value);
  if (value.kind === KIND.PARAMETER) {
    const encodedKey = encodeURIComponent(value.key.replaceAll("*", "sample"));
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

export function reviewCandidates(candidates, officialRules = []) {
  return candidates.map((candidate) => {
    const assessment = assessCandidate(candidate, officialRules);
    return {
      ...assessment,
      fixtures: generateCandidateFixtures(candidate),
    };
  });
}
