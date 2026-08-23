# Tracking parameter provenance

This note records the public documentation used to maintain the conservative `privacy-common-params` package.

Only parameter names and factual semantics are compiled here. No third-party filter list or executable source is copied into Request Control Evo.

## Vendor-documented click / campaign attribution parameters

### Google

Sources:

- https://support.google.com/google-ads/answer/3095550
- https://support.google.com/analytics/answer/15612152
- https://support.google.com/analytics/answer/11367152

Covered parameters:

- `gclid`
- `dclid`
- `gclsrc`
- `gbraid`
- `wbraid`

These are documented as advertising/click/campaign attribution identifiers or associated auto-tagging parameters.

### Microsoft Advertising

Source:

- https://learn.microsoft.com/en-us/advertising/guides/uet-conversion-api-integration?view=bingads-13

Covered parameter:

- `msclkid`

Microsoft documents it as a click identifier appended to a landing-page query string for conversion attribution.

### X

Source:

- https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites

Covered parameter:

- `twclid`

X documents it as a click ID used for advertising attribution and passed from the landing-page URL / first-party cookie.

### Mailchimp

Source:

- https://mailchimp.com/developer/marketing/docs/e-commerce/

Covered parameters:

- `mc_cid`
- `mc_eid`

Mailchimp documents these as campaign and recipient/email tracking identifiers added to campaign links.

### Matomo

Sources:

- https://matomo.org/faq/general/how-to-track-google-ads-campaigns-with-matomo/
- https://matomo.org/faq/how-to/faq_120/

Covered parameters:

- `mtm_campaign`
- `mtm_kwd`
- `mtm_keyword`
- `mtm_source`
- `mtm_medium`
- `mtm_content`
- `mtm_cid`
- `matomo_campaign`
- `pk_campaign`
- `pk_kwd`
- `pk_keyword`
- `piwik_campaign`
- `piwik_kwd`

Matomo documents these as campaign-name, campaign-keyword, source/medium/content/ID parameters or backwards-compatible campaign aliases.

## Review policy

A documented parameter is not automatically eligible for the default cleanup rule. It is included only when its documented purpose is attribution/tracking rather than navigation, authentication, signed-request integrity, pagination, search, localization or other functional behavior.

Ambiguous names such as generic `ref`, `source`, `campaign`, `id`, `token`, `state`, `redirect` or `session` remain outside the default rule unless their semantics are scoped narrowly enough to prove safe.
