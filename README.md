# Request Control Rule Catalogs

Versioned remote rule catalogs for [Request Control Evo](https://github.com/HyperCriSiS/Request-Control-Evo).

## Channels

### `official/`

Maintainer-reviewed Request Control Evo rule packages. These are the normal remote rule source for the extension and may be updated independently from an extension release.

Every package has a stable catalog ID, version and SHA-256 digest. Existing managed rules are reconciled by UUID; locally modified managed rules are reported as conflicts and are not silently overwritten.

### `community/`

Community-submitted packages. Community popularity is not a safety or trust signal. Packages remain separate from Official until they have been independently reviewed, tested and deliberately promoted by maintainers.

## Update model

The extension checks catalog metadata when the Imports view is opened. Installed remote packages are then checked against their published SHA-256 digest. Users can update one package or apply all currently available Official updates in bulk. Updates are never silently installed in the background.

Rule-package updates do not require a new extension release unless the rule engine/schema itself changes.

## External-source curation

Research sources such as ClearURLs and FastForward are processed **outside the extension**. `scripts/sources.mjs` records source/license policy and `scripts/curation.mjs` normalizes reviewed candidate fixtures before maintainers turn them into native Request Control rules.

The extension never downloads upstream project data or runs their formats directly. The pipeline is:

`upstream research -> offline adapter -> normalized candidate -> risk/conflict review -> regression fixtures -> Official native rule`

This separation keeps external-source diagnostics, licensing decisions and maintenance tooling out of the browser extension.

### Adapter eligibility

`review-only` describes the trust boundary; it does **not** automatically mean that an upstream source is safe to parse. `scripts/sources.mjs` therefore records a separate adapter status and rationale for every research source. Only sources marked `active` may have an automated offline adapter.

At present, the active adapters remain deliberately limited to ClearURLs reviewed parameter candidates and FastForward deterministic URL-only redirect candidates. Actually Legitimate URL Shortener Tool remains deferred: its list mixes per-entry provenance and contains regex, domain-exception and path-sensitive `$removeparam` semantics that must not be approximated as native Evo rules.

## Principles

- Declarative JSON data only; no remote executable code.
- Stable UUIDs for published rules.
- SHA-256 integrity metadata for every catalog package.
- Local edits to managed rules are never silently overwritten.
- Official and Community are distinct trust channels.
- No browsing history, credentials, tokens or private URLs in submissions or curation fixtures.
- Broad rules require explicit compatibility review and regression examples.

## Validation

CI runs:

```bash
node scripts/validate.mjs
node scripts/curation-selftest.mjs
node scripts/promotion-selftest.mjs
```

The validator checks both channel catalogs, package hashes, UUID uniqueness and basic rule structure.

## Curation review gate

External projects are discovery inputs only. Candidate rules are normalized offline and compared with the current `official/rules/` corpus before review. The report classifies a candidate relative to Official as `duplicate`, `narrower`, `broader`, `contradictory`, or `none`. A candidate is promotion-ready only when its risk is low, no Official conflict is found, and generated positive/negative fixtures are valid.

Run a review locally with:

```sh
node scripts/review-candidates.mjs path/to/candidates.json
```

The command reads only local repository files. It does not fetch upstream data or execute third-party code. Source adapters remain separate development tooling, and provenance stays attached to every candidate through `sourceId`.

## Community → Official promotion

Promotion is deliberately **not automatic**. A Community package can only produce a promotion plan after an explicit maintainer review file is supplied:

```sh
node scripts/plan-community-promotion.mjs <community-entry-id> path/to/review.json
```

The plan:

- preserves the Community catalog/entry/version/source digest as provenance;
- detects exact Official duplicates and UUID collisions;
- assesses broad/high-impact native rules;
- requires explicit acceptance for every non-low-risk reason;
- requires positive and negative review fixtures for every new rule;
- emits a proposed Official entry/rule payload only when all gates pass.

The command does **not** modify `official/`, publish a catalog, create a commit or merge a PR. Promotion therefore remains a deliberate maintainer action after reviewing the generated plan. `fixtures/promotion/review.example.json` documents the review format.
