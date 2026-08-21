# Official package audit — 2026-08-22

This is the second payload-level audit of the Official catalog for Request Control Evo 1.20 hardening.

## Method

- Re-read all 19 `official/rules/*.json` payloads, not only catalog metadata.
- Reviewed native actions, enabled state, request scope, wildcard/global matching, redirect/filter behavior, overlap, and practical compatibility risk.
- Preserve package IDs and existing native UUIDs whenever semantics remain the same.
- Prefer conservative changes for already-managed rules: reducing an existing rule's reach is acceptable; silently broadening an installed rule is not.
- Package splitting remains available through the managed-package migration contract, but is avoided when a native-rule split inside the existing package communicates the risk more clearly without adding catalog clutter.

## Second-pass decisions

| Package | Payload summary | Decision |
| --- | --- | --- |
| `developer-direct-raw` | 2 Redirect rules, both disabled, site-specific | Keep. Low risk; intentionally opt-in at rule level. |
| `media-original-quality` | 2 active Redirect rules for Wikimedia/Twitter media | Keep. Site-specific and narrowly matched. |
| `other-skip-image-downsamplers` | 1 active global image Filter using a downsampler regex | Keep Advanced / Medium. Broad image matching is correctly treated as specialist behavior. |
| `privacy-aggressive-direct-links` | 5 Redirect rules, all disabled | Keep Advanced / Medium. Overlaps some Google/Facebook/site-specific direct-link cleanup but remains an explicit expert alternative. |
| `privacy-amazon` | 1 strict allowed-parameter Filter + 1 Picasso Redirect | Keep package identity; rename display to Amazon / Prime Video URL cleanup and raise risk Low → Medium because the active navigation filter is an allow-list, not a small deny-list. |
| `privacy-bing` | 1 selected-parameter Filter | Keep; rename display to Bing URL cleanup. |
| `privacy-block-beacon-and-ping` | 1 active global Block rule covering both request types | Risks differ. Split the native rule inside the existing package: Ping stays enabled on the existing UUID; Beacon gets a new UUID and is disabled by default. This preserves package identity and avoids adding two more catalog rows. |
| `privacy-common-images` | 22 rules: 7 Filters + 15 Whitelists, broad global image/media cleanup | Keep Advanced / High; rename display to Aggressive image/media URL cleanup. Still the strongest future package-split candidate. |
| `privacy-common-params` | 1 global navigation parameter Filter + 1 compatibility Whitelist | Narrow the existing UUID to well-known tracking names; move generic `ref_*`, `referer`, `referrer`, and `share` into a new disabled rule. Keep Standard / Medium because default behavior becomes safer while expert cleanup remains available. |
| `privacy-common-redirectors` | 7 mixed Filter/Redirect rules; broad global heuristic already disabled | Move Standard → Advanced. The curated rules are useful, but cross-site navigation/frame/media rewriting is more compatibility-sensitive than ordinary parameter cleanup. |
| `privacy-duckduckgo` | 1 outbound-wrapper Filter | Keep; rename display to DuckDuckGo direct-link cleanup. |
| `privacy-enhanced-embeds` | 2 supported embed Redirects | Keep Standard / Low. YouTube privacy host and Vimeo `dnt=1` are narrow embed-only changes. |
| `privacy-facebook` | 2 Filters + 1 fb.me Redirect | Keep; rename display to Facebook / Instagram URL cleanup. |
| `privacy-google` | 3 Filters + 1 Redirect; image anonymization Filter disabled | Keep Standard / Medium; rename display to Google URL cleanup. Disabled map/image rule keeps the most fragile behavior opt-in. |
| `privacy-youtube` | 1 URL Filter + 1 disabled logger Block + 1 youtu.be Redirect | Keep Standard / Medium; rename display to YouTube URL cleanup. Logger blocking remains opt-in. |
| `search-engine-escape` | 2 search-provider Redirects, both disabled | Keep Advanced / High. Provider override classification is accurate and distinct from privacy cleanup. |
| `special-first-party-firewall` | 1 disabled global third-party subresource Block rule | Keep Advanced / High. Warning and disabled default are mandatory. |
| `special-text-first-low-bandwidth` | 3 active global Block rules for images/media/fonts | Keep Advanced / High; clarify that imported rules are active immediately and substantially change rendering. |
| `web-canonical-desktop` | 3 Redirect rules, all disabled | Keep Standard / Low. Preference-oriented but narrow and opt-in at rule level. |

## Overlap conclusions

- Google/Facebook direct-link handling overlaps with `privacy-aggressive-direct-links`, but the latter remains disabled and deliberately explicit; merging would reduce user choice without a maintenance benefit.
- `privacy-common-redirectors` overlaps some site-specific redirect cleanup, but its cross-service scope justifies an Advanced package rather than a merge.
- `privacy-common-images` contains compatibility allow-rules for Google, YouTube, Amazon and other providers; those are safeguards for its global media filter behavior, not duplicates suitable for deletion.
- No package merge is justified in this pass.

## Identity and update safety

- No Official package ID changes.
- Existing native UUIDs remain stable for unchanged rules.
- The former combined Beacon/Ping UUID becomes the narrower Ping-only rule. This is a conservative compatibility change for existing managed installations.
- The existing common-parameter UUID becomes the narrower default tracking cleanup rule. The broad referral/share cleanup gets a new disabled UUID.
- No managed installation is silently broadened by this audit.
