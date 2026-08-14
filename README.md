# Request Control Community Rules

Versioned, reviewable rule catalogs for [Request Control](https://github.com/HyperCriSiS/requestcontrol).

## Principles

- Rules are declarative JSON data only; no remote executable code.
- Every rule must have a stable UUID.
- Broad rules require explicit compatibility exceptions and regression examples.
- A rule update must not silently overwrite a locally modified managed rule in the extension.
- Popularity is not a safety signal. Review and tests take precedence over ratings.

## Layout

- `catalog.json` — catalog metadata consumed by clients.
- `rules/` — Request Control compatible JSON rule lists.
- `scripts/validate.mjs` — dependency-free validation used by CI.

## Contributing

Submit a pull request against `dev`. Include example URLs and, for broad privacy rules, at least one known compatibility case. New or changed rules must keep UUIDs stable once published.

The initial catalog is intentionally conservative. Additional rules from upstream history will be added only after validation against current sites.
