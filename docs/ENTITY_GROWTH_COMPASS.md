# Mason × Swell Entity Growth Compass

This document adapts the GEO Compass and Blue Ocean Content Strategy into an operating standard for Swell Marketing. It protects two distinct entities while making their relationship useful.

## 1. Entity model

| Entity | Canonical ID | Role | Must not become |
|---|---|---|---|
| Mason Nguyen | `https://masonnguyengeo.com/#mason-nguyen` | Founder, researcher, category strategist, and canonical author of original concepts and frameworks | An alternate name or `sameAs` identity for Swell |
| Swell Marketing | `https://swellmarketing.xyz/#organization` | Distinct GEO agency applying research through diagnostics, implementation, managed programs, tools, and education | A personal blog, a duplicate of Mason's site, or an alternate name for AURE |
| AURE | `https://au-re.org/` | Separate ecosystem organization and optional advanced case-study subject | A parent, legal identity, or alternate name for Swell |

Allowed relationship language:

- “Swell Marketing was founded by Mason Nguyen.”
- “Mason's research informs Swell's operating standards.”
- “Swell applies the concepts through client work, tools, and education.”
- “AURE is a separate ecosystem organization.”

Do not use `sameAs` between Mason and Swell. Use `founder`, `author`, `creator`, `subjectOf`, or a plain editorial link when that is the real relationship.

## 2. Clear ownership

| Mason owns | Swell owns |
|---|---|
| Original definitions and named concepts | Applied diagnostics and implementation |
| Founder point of view and category theses | Service pages, plans, scope, and conversion |
| Research, analysis, and public experiments | Templates, checklists, quality gates, and buyer tools |
| Canonical framework documentation | Operational translation of those frameworks |
| Personal entity authority | Swell's organizational entity authority |
| Blue-ocean pillars and authored essays | Evidence-backed delivery notes and approved case studies |

The division is “source → application,” not “thought leader → duplicate corporate blog.”

## 3. The Swell publishing test

Every Swell page must answer:

> Does this help a buyer diagnose, decide, implement, or verify something that Mason's research establishes?

A Swell page must contain at least one applied qualifier:

1. A diagnostic or decision tool.
2. An implementation pattern with acceptance criteria.
3. A delivery artifact, checklist, or operating protocol.
4. Verified evidence from Swell's own work, clearly labeled and approved for publication.
5. A learning path that turns a canonical concept into a practical capability.

If a draft only defines a term or expresses Mason's point of view, it belongs on masonnguyengeo.com. Swell should link to the canonical source and add the practical next step.

## 4. Research-to-execution routes

| Canonical research source | Swell application |
|---|---|
| `masonnguyengeo.com/what-is-geo` | `/geo-audit/`, `/services/` |
| `masonnguyengeo.com/arm-framework` | `/method/`, `/roadmap.html` |
| `masonnguyengeo.com/ai-visibility-strategy` | `/services/`, `/pricing/` |
| `masonnguyengeo.com/knowledge-graph-authority` | `/geo-audit/`, entity architecture service |
| `masonnguyengeo.com/intelligence-infrastructure` | `/academy/`, `/roadmap.html` |
| `masonnguyengeo.com/about` | `/about/` for founder-to-company context |

Future blue-ocean work follows the same pattern:

- Mason publishes the Agentic GEO thesis; Swell publishes a readiness assessment or implementation offer.
- Mason publishes Multi-Entity Signal Architecture; Swell publishes an entity-disambiguation audit and implementation checklist.
- Mason publishes Governance-Grade GEO; Swell publishes quality gates, review controls, and delivery protocols.
- Mason publishes Personal Entity GEO; Swell offers a founder/company boundary audit without claiming ownership of the concept.

Do not link to an unpublished future slug.

## 5. Cross-link rules

1. Swell links to Mason when introducing a concept Mason owns.
2. Mason links to Swell when a reader needs an audit, implementation, managed program, or training path.
3. Use descriptive anchor text. Do not use generic “learn more.”
4. Do not copy full definitions or framework sections between sites.
5. One canonical source per concept. Swell summarizes only enough to support an applied decision.
6. Keep `swellmarketing.xyz` as Swell's canonical domain in Swell-controlled schema and files.
7. Review both sites after any entity, domain, founder, or ecosystem relationship changes.

## 6. Swell anti-slop gate

Before publishing:

- [ ] The page serves Swell's applied role.
- [ ] The page names its audience and decision.
- [ ] Any Mason-owned concept links to its canonical source.
- [ ] Claims are sourced, qualified, or labeled as methodology.
- [ ] The page includes acceptance criteria or a concrete next step.
- [ ] The page does not repeat an article already owned by Mason.
- [ ] Mason and Swell use distinct schema identifiers.
- [ ] AURE is not represented as Swell's parent, alias, or legal identity.
- [ ] Internal and external links pass validation.
- [ ] The page adds signal rather than publishing for volume.

## 7. Measurement

Measure each entity separately, then measure the bridge:

- Mason: citations to Mason, framework attribution, concept adoption, and branded probe accuracy.
- Swell: qualified audit starts, discovery conversations, plan fit, enrollment handoffs, and organizational citation accuracy.
- Bridge: referral paths from Mason research to Swell application pages and backlinks from Swell to canonical Mason sources.

Shared growth is healthy only when attribution remains accurate.

## 8. Known cross-site reconciliation item

As of 2026-08-08, Mason's live `llms.txt` and homepage schema refer to Swell using `swellmarketing.agency` and group Swell inside the AURE ecosystem. Swell-controlled files use `swellmarketing.xyz` and explicitly identify AURE as separate. The Mason repository should receive a coordinated entity update so both sites describe the same domain and relationship model.

