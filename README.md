# Request Control Community Rules

Versioned, reviewable rule catalogs for [Request Control Evo](https://github.com/HyperCriSiS/Request-Control-Evo).

## Principles

- Rules are declarative JSON data only; no remote executable code.
- Every rule must have a stable UUID.
- Broad rules require explicit compatibility exceptions and regression examples.
- A rule update must not silently overwrite a locally modified managed rule in the extension.
- Popularity is not a safety signal. Review, integrity hashes and tests take precedence over ratings.
- Submissions must not contain browsing history, private URLs, credentials, tokens or other sensitive values.

## Layout

- `catalog.json` — catalog metadata consumed by clients.
- `rules/` — Request Control compatible JSON rule lists.
- `.github/ISSUE_TEMPLATE/rule-set-submission.md` — reviewable GitHub submission flow used by the extension.
- `scripts/validate.mjs` — dependency-free validation used by CI.

## Catalog metadata

Catalog schema version 2 can attach presentation/community metadata to a rule set without changing the rule JSON itself:

- `description` — short human-readable description shown in the import UI and as a tooltip.
- `homepage` — human-readable GitHub/source page; clients should not force users to inspect a raw JSON URL.
- `sha256` — integrity digest for the downloadable rule JSON.
- `ratingIssue` — GitHub issue number used as the community rating/review thread.
- `ratingRepository` — optional repository override for that rating issue; otherwise the catalog-level repository is used.

Older entries without these optional fields remain valid.

## Sharing rule sets

Request Control can generate a reviewable submission from explicitly selected local rules and open the GitHub issue form. GitHub handles authentication; the extension does not store a GitHub token or upload browsing data automatically.

Before submitting, review the generated JSON and remove private or sensitive values. For payloads too large to prefill safely in an issue URL, the extension exports a JSON file which can be attached or pasted into the issue form.

Submissions are reviewed before being added to the catalog. A submission becoming popular does not bypass review, integrity validation or compatibility checks.

## Community ratings

A catalog entry may reference a dedicated GitHub issue through `ratingIssue`. The extension displays 👍 and 👎 reaction counts as a coarse discovery/usefulness signal and links to the issue for comments and compatibility reports.

Ratings are **not** a trust, safety or correctness score. They never override catalog review status, SHA-256 integrity verification, regression tests or maintainers' compatibility decisions.

If GitHub is unavailable, ratings and community metadata are optional: built-in/local rule imports and integrity checking must continue to work.

## Contributing

For normal community submissions, use the **Rule set submission** issue template. Include example URLs and, for broad privacy rules, at least one known compatibility case. New or changed rules must keep UUIDs stable once published.

Maintainer changes can also be proposed through a pull request using the repository's active development workflow.

The catalog is intentionally conservative. Additional rules from upstream history are added only after validation against current sites.
