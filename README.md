# Request Control Rule Catalogs

Versioned remote rule catalogs for [Request Control Evo](https://github.com/HyperCriSiS/Request-Control-Evo).

## Channels

### `official/`

Maintainer-reviewed Request Control Evo rule packages. These are the normal remote rule source for the extension and may be updated independently from an extension release.

Every package has a stable catalog ID, version and SHA-256 digest. Existing managed rules are reconciled by UUID; locally modified managed rules are reported as conflicts and are not silently overwritten.

### `community/`

Community-submitted packages. Community popularity is not a safety or trust signal. Packages remain separate from Official until they have been independently reviewed, tested and deliberately promoted by maintainers.

### Root `catalog.json` / `rules/`

Legacy compatibility for Request Control Evo versions that predate the Official/Community channel split. New clients do not use this catalog.

## Update model

The extension checks catalog metadata when the Imports view is opened. Installed remote packages are then checked against their published SHA-256 digest. Users can update one package or apply all currently available Official updates in bulk. Updates are never silently installed in the background.

Rule-package updates do not require a new extension release unless the rule engine/schema itself changes.

## External-source curation

Research sources such as ClearURLs and FastForward are processed **outside the extension**. `scripts/sources.mjs` records source/license policy and `scripts/curation.mjs` normalizes reviewed candidate fixtures before maintainers turn them into native Request Control rules.

The extension never downloads upstream project data or runs their formats directly. The pipeline is:

`upstream research -> offline adapter -> normalized candidate -> risk/conflict review -> regression fixtures -> Official native rule`

This separation keeps external-source diagnostics, licensing decisions and maintenance tooling out of the browser extension.

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
```

The validator checks both channel catalogs, package hashes, UUID uniqueness and basic rule structure.
