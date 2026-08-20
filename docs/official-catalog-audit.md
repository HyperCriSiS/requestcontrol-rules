# Official catalog audit

Audit date: 2026-08-20

This document records the full Request Control Evo Official catalog review required by the extension roadmap. The audit is based on the actual native rule payloads, not package names alone.

## Presentation contract

`Official`, `Community`, and `Custom` remain **trust/provenance channels**. They must not be used as behavior categories.

Within a channel, package discoverability uses these independent fields:

- `presentation`: `standard` or `advanced`.
- `behavior`: the primary user-facing job of the package.
- `scope`: `site-specific`, `cross-site`, or `global`.
- `risk`: `low`, `medium`, or `high`.

**Standard** is for common, understandable Request Control behavior: URL cleanup, curated direct-link handling, URL normalization, site cleanup, privacy-enhanced embeds, and narrowly scoped media transformations.

**Advanced** is for unusual, expert, broad, disruptive, or higher-impact behavior: global request-type blocking, heuristic image manipulation, provider overrides, firewall-like modes, and low-bandwidth/text-first modes. Advanced changes presentation/discoverability only; it does not remove capability.

The catalog ID, package URL, native rule UUIDs, and managed-source identity are not changed by this classification.

## Full package review

| Package | Actual action mix | Behavior | Scope | Risk | Presentation | Audit finding | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `developer-direct-raw` | redirect×2 | direct-link | site-specific | low | Standard | Direct/raw developer links. Distinct; no meaningful overlap. | Keep Standard. Rules stay disabled by default. |
| `media-original-quality` | redirect×2 | media-quality | site-specific | low | Standard | Original-quality media redirects. Distinct from privacy cleanup; changes media representation only on supported hosts. | Keep Standard. |
| `other-skip-image-downsamplers` | filter×1 | media-url-cleanup | global | medium | Advanced | Broad image URL filtering. Heuristic/global image handling can overlap conceptually with image privacy cleanup and can affect delivery. | Advanced. Keep separate for now; candidate for tighter scoping. |
| `privacy-aggressive-direct-links` | redirect×5 | direct-link | cross-site | medium | Advanced | Destination extraction from outbound/security wrappers. Conceptual overlap with Common Redirectors plus Google/Facebook site packages; patterns are not identical. | Advanced. Keep stable ID; evaluate later merge/split only with UUID-preserving migration. |
| `privacy-amazon` | filter×1; redirect×1 | site-cleanup | site-specific | low | Standard | Amazon parameter cleanup + Picasso redirect skip. Site-specific and coherent. | Keep Standard. |
| `privacy-bing` | filter×1 | site-cleanup | site-specific | low | Standard | Bing parameter cleanup. Site-specific and simple. | Keep Standard. |
| `privacy-block-beacon-and-ping` | block×1 | request-blocking | global | medium | Advanced | Global request-type blocking. Generic blocker rather than URL cleanup; can resemble ad-blocker functionality. | Advanced; explicit warning. |
| `privacy-common-images` | filter×7; whitelist×15 | media-url-cleanup | global | high | Advanced | Global image/media URL filtering plus compatibility allow-rules. 22 rules: 7 filters and 15 whitelists. Name/description previously understated complexity; significant compatibility surface. | Advanced/high risk. Keep ID for compatibility; prioritize future decomposition into safer narrowly scoped packages. |
| `privacy-common-params` | filter×1; whitelist×1 | url-cleanup | global | medium | Standard | Common tracking-parameter cleanup. Core URL-cleanup behavior; one compatibility whitelist. | Keep Standard. |
| `privacy-common-redirectors` | filter×5; redirect×2 | direct-link | cross-site | medium | Standard | Curated redirector/dereferrer skipping. Some overlap with Aggressive Direct Links; broadest heuristic is already disabled. | Keep Standard/medium risk; audit overlap before any package merge. |
| `privacy-duckduckgo` | filter×1 | direct-link | site-specific | low | Standard | DuckDuckGo redirect-wrapper cleanup. Simple site-specific direct-link behavior. | Keep Standard. |
| `privacy-enhanced-embeds` | redirect×2 | privacy-embed | site-specific | low | Standard | Privacy-enhanced YouTube/Vimeo embeds. Distinct embed transformation. | Keep Standard. |
| `privacy-facebook` | filter×2; redirect×1 | site-cleanup | site-specific | low | Standard | Facebook/Instagram wrapper + parameter cleanup. Partly overlaps Aggressive Direct Links for Facebook shim handling but remains coherent as site cleanup. | Keep Standard; later deduplicate only with managed-rule migration. |
| `privacy-google` | filter×3; redirect×1 | site-cleanup | site-specific | medium | Standard | Google result/page cleanup + AMP skip. Partly overlaps Aggressive Direct Links for Google outbound handling; one image rule disabled. | Keep Standard/medium risk. |
| `privacy-youtube` | block×1; filter×1; redirect×1 | site-cleanup | site-specific | medium | Standard | YouTube URL cleanup + youtu.be normalization; optional logger block. Mixed action types, but active behavior remains site cleanup; block rule is disabled. | Keep Standard/medium risk; package summary must mention the optional blocker. |
| `search-engine-escape` | redirect×2 | provider-override | cross-site | high | Advanced | Search-provider override. Previously categorized as privacy/redirects although it deliberately replaces Google/Bing searches with DuckDuckGo. | Advanced/high impact; warn. |
| `special-first-party-firewall` | block×1 | special-mode | global | high | Advanced | Strict global first-party firewall mode. High-breakage global blocker by design. | Advanced/high risk; keep disabled by default and clearly warned. |
| `special-text-first-low-bandwidth` | block×3 | special-mode | global | high | Advanced | Global text-first mode. Blocks images, media and fonts; disruptive mode rather than normal filtering. | Advanced/high risk; explicit warning. |
| `web-canonical-desktop` | redirect×3 | url-normalization | site-specific | low | Standard | Mobile-to-desktop URL normalization. Distinct URL-normalization behavior; rules disabled by default. | Keep Standard. |

## Cross-package findings

1. **Image privacy is the largest current complexity hotspot.** `privacy-common-images` is not a simple tracking-parameter list: it contains 22 native rules, including 15 compatibility whitelists. It is therefore classified Advanced/high risk and should be the first candidate for future decomposition.
2. **Direct-link handling has controlled overlap.** `privacy-common-redirectors`, `privacy-aggressive-direct-links`, and the Google/Facebook site packages touch some of the same user goals or hosts. They are not byte-for-byte duplicates, so this audit does not remove or merge them. Any future consolidation must preserve native UUIDs, managed package identity, update/conflict behavior, and local modifications.
3. **Generic request blocking belongs in Advanced.** `privacy-block-beacon-and-ping`, Strict First-Party Mode, and Text-first/Low-bandwidth are useful Request Control capabilities, but they should not make the normal catalog read like a generic ad-block/filter-list product.
4. **Search Engine Escape was miscategorized.** Its real function is a search-provider override, not ordinary privacy cleanup. It is now classified Advanced/high impact and its catalog description explicitly states that behavior.
5. **Disabled-by-default rules remain important context.** Several Standard packages contain optional disabled rules. Package summaries should say so where the disabled behavior materially changes the package's perceived risk.

## Restructuring policy

This audit intentionally performs **classification and description corrections before identity-changing restructuring**. No package ID or native rule UUID is changed in this pass. This protects installed managed rules and permits older Request Control Evo versions to continue consuming schema-v3 catalogs while ignoring the added metadata.

Future package removal, splitting, or merging requires explicit migration tests proving:

- managed rule identity remains deterministic;
- local modifications are preserved as conflicts rather than overwritten;
- remote update checks still resolve the correct package;
- no active rule is silently enabled or disabled;
- older extension versions continue to fail safely or ignore optional metadata.
