# Swell Marketing Site — Agent Handoff

This repository is the production source for **swellmarketing.xyz**. It is a static HTML/CSS/JavaScript site deployed through Vercel. It presents Swell’s authority library, conversion path, and approved consultative service menu.

## Primary files and validation

| Area | Location | Rule |
| --- | --- | --- |
| Shared presentation | `assets/site.css` | Extend the existing visual system; do not introduce a parallel design language. |
| CTA attribution | `assets/attribution.js` | Preserve the canonical tracked booking convention and do not replace it with public checkout. |
| Main public pages | `index.html`, `services/index.html`, `method/index.html`, `pricing/index.html`, `geo-audit/index.html`, `fit-review/index.html` | Keep the path **diagnostic or fit review → written scope → private collection** explicit. |
| Authority library | `resources/` | New material must be source-governed, people-first, internally linked, visibly dated where appropriate, and clear about what the source does and does not establish. |
| Discovery files | `sitemap.xml`, `robots.txt`, `llms.txt` | Update all relevant discovery surfaces when a public resource is added, moved, or removed. |
| Local verification | `scripts/check-links.mjs` | Run `node scripts/check-links.mjs` after any public route or link change. |

## Approved offers and claim boundary

Swell’s current public menu is **Swell GEO Growth ($2,500/month)** and **Swell GEO Scale ($3,500/month)**. Both are consultative recurring engagements. Do not introduce a public payment page, a lower unapproved plan, checkout copy, an unlimited-content promise, or a Firehose-dependent monitoring promise.

The current market-ready framing is **representation and agent readiness**: clear, crawlable information; visible-to-structured-data parity; accessible, stable paths; approved source-led content; and a documented operating cadence. It must never be framed as a guarantee of ranking, AI citation, model inclusion, lead volume, conversions, or third-party model behavior.

## Content and conversion controls

Do not fabricate reviews, ratings, client stories, performance data, or social proof. Use a named source and an approved publication right for every public result claim. LinkedIn distribution requires a separate owner confirmation for each post. Treat all prospect communications as private operating material, never public proof.

The former Firehose tap is paused. Do not resume or replace it without explicit owner approval of a narrow monitoring purpose, source scope, retention plan, and review cadence.

The old `/enroll.html` learning concept is noindex and contains legacy conceptual material. Do not use it as sales proof or copy its unsupported claims into public conversion pages without an explicit claim-safety rewrite.

## Collaboration workflow

Before editing, read the directly affected page, `assets/site.css`, and the relevant operating record in `/home/ubuntu/arm-cashflow/`. Write code, configuration, comments, tests, commit messages, file names, and implementation-facing documentation in English. Use another language only for explicitly approved public-facing localized content, with an English review note where it affects implementation. Preserve canonical paths and attribution parameters. Validate route links locally, inspect the rendered production route when a public CTA changes, and retain a short operating note for any cross-property decision. Never commit secrets, personal data, payment information, raw intake records, or private prospect material.
