# Catalog licensing and provenance inventory

Status: **inventory only — not a repository-wide license declaration**.

This document records what can currently be established about authorship/provenance of the Request Control rule catalogs. It exists so a future repository/contribution licensing policy can be chosen without accidentally relicensing material whose governing terms differ.

## Current governance state

- `requestcontrol-rules` has no repository-level `LICENSE` file, and no `LICENSE` file appears in the repository history through the current `main` lineage.
- The linked Request Control Evo extension is licensed under MPL-2.0.
- The original upstream `tumpio/requestcontrol` repository uses the same MPL-2.0 license text.
- External research sources are separately classified in `scripts/sources.mjs`; those classifications do not grant a license to republish or relicense their contents.
- Mixed external corpora now require entry-level provenance before curation can accept a candidate, and `licenseReviewRequired` prevents promotion when the source policy is unresolved.
- Community submissions currently have no repository-wide contribution/license grant. Until issue #13 is resolved, provenance/rights information must be collected rather than inferred.

## Historical Official split

Commit `6bb356e20ffe5bd63723f3e02ee52848699b5629` created the Official/Community channel split. At that point, 11 of the 19 Official packages explicitly recorded a legacy source under `tumpio.github.io/requestcontrol`:

- `other-skip-image-downsamplers`
- `privacy-amazon`
- `privacy-bing`
- `privacy-block-beacon-and-ping`
- `privacy-common-images`
- `privacy-common-params`
- `privacy-common-redirectors`
- `privacy-duckduckgo`
- `privacy-facebook`
- `privacy-google`
- `privacy-youtube`

Eight packages in the same split did not carry a legacy upstream source and appear to be Evo-era additions at the package level:

- `developer-direct-raw`
- `media-original-quality`
- `privacy-aggressive-direct-links`
- `privacy-enhanced-embeds`
- `search-engine-escape`
- `special-first-party-firewall`
- `special-text-first-low-bandwidth`
- `web-canonical-desktop`

Later cleanup intentionally removed legacy compatibility fields from the live catalog. That was valid for runtime identity, but it means licensing/provenance work must consult Git history rather than treating the current catalog metadata as a complete authorship record.

The package-level classification above is **not** sufficient to assign a license to every contained rule. A package inherited from the MPL-2.0 Request Control corpus may still contain rules inspired by, adapted from, or explicitly imported from other projects.

## Rule-level provenance flags already visible in historical payloads

### `privacy-common-params`

The original catalog initialization (`d4c95df402da235cdfe418cd8ceebf17a128d61c`) recorded `source: "tumpio/requestcontrol"`, while the rule description says `Replicates Neat URL extension.` This establishes the Request Control lineage but does not prove whether the parameter list was independently recreated or copied from a particular Neat URL revision.

Neat URL itself is GPL-family software. Its current `LICENSE.md` states GPL version 2 or, at the recipient's option, any later version; historical Mozilla Add-ons metadata for version 5.0.0 described the add-on as GPL-2.0-only. The exact source revision, if any, used for this Request Control rule therefore must be identified before assigning rule-level licensing.

### `privacy-youtube`

A historical rule description states `Imported from Neat URL webextension.` This is stronger than an inspiration note and should be treated as requiring source/revision and license verification before any repository-wide default license is claimed to cover that rule.

### `privacy-common-images`

A historical rule description states `Inspired by GIF Tracking Protection webextension.` Mozilla Add-ons metadata for GIF Tracking Protection reports WTFPL. `Inspired by` does not by itself establish copied copyrightable expression, so the actual implementation history must be reviewed before deciding whether a distinct license notice is needed.

Other descriptions mention external behavior or compatibility references (for example uBlock Origin). Such references are evidence to investigate, not proof that source material was copied.

## External curation sources

The curation registry currently records these source-license policies:

| Source | Recorded license/policy | Adapter status | Promotion implication |
| --- | --- | --- | --- |
| Request Control Evo native | MPL-2.0 | N/A | Bundle-eligible, subject to the repository licensing decision for native catalog data |
| ClearURLs Rules | LGPL-3.0 | Active | Review-only deterministic candidates; source-level provenance |
| Actually Legitimate URL Shortener Tool | Dandelicence / mixed per-entry provenance | Deferred | Entry-level provenance required and separate license review still blocks promotion |
| AdGuard URL Tracking | GPL-3.0 | Deferred | Exception semantics plus explicit license review required |
| Redirector | MIT | N/A/inspiration | Inspiration only, not a canonical feed |
| FastForward | Unlicense | Active | Review-only deterministic URL candidates; source-level provenance |
| Ghostery Tracker Database | CC-BY-NC-SA-4.0 | Deferred | Separate license/data-model review required |
| Privacy Badger | GPL-3.0 | N/A/inspiration | Behavioral inspiration only |
| LocalCDN | MPL-2.0 | Deferred | Outside current URL-rule curation scope |

An adapter being `active` means only that its supported syntax can be normalized safely for offline review. It does **not** mean upstream material may automatically be copied into Official under a different license.

## Required work before assigning a repository-wide default license

1. Trace every current Official UUID to its earliest Request Control/Evo commit or other documented origin.
2. Classify each rule as one of: upstream Request Control lineage, Evo-native, externally derived/adapted, externally inspired only, or unresolved.
3. For externally derived/adapted rules, record immutable source revision/URL and governing license; do not infer provenance from package-level labels.
4. Resolve the explicitly flagged Neat URL and GIF Tracking Protection cases first, then search rule history/descriptions for additional third-party references.
5. Choose a default license only for the subset whose rights support it; define file/entry-level overrides for differently licensed material.
6. Define Community contribution terms and required rights/provenance declarations before accepting new catalog entries as promotable.
7. Update validation/promotion tooling only after the policy is decided, so tooling enforces the policy rather than inventing it.

Issue #13 tracks the repository/contribution licensing decision. Issue #12 separately tracks the lineage mapping required before the deferred Legitimate URL Shortener adapter can be reconsidered.
