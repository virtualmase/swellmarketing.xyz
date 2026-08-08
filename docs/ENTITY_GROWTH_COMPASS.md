# Mason × Swell Entity Growth Compass

This document adapts the GEO Compass and Blue Ocean Content Strategy into an operating standard for Swell Marketing. It protects the identities in the Arcturus Analytics Group while making their relationships useful. The machine-readable source of truth is `data/entity-registry.json`.

## 1. Entity model

| Entity | Canonical ID | Role | Must not become |
|---|---|---|---|
| Arcturus Analytics Group | None; no public website | Group and container for Swell Marketing and AURE | A fabricated URL, an alias for either member, or a container for ARM or Arctura |
| Mason Nguyen | `https://masonnguyengeo.com/#mason-nguyen` | Service provider, researcher, category strategist, and canonical author of original concepts and frameworks | An alternate name or `sameAs` identity for Swell |
| Swell Marketing | `https://swellmarketing.xyz/#organization` | Distinct GEO agency applying research through diagnostics, implementation, managed programs, tools, and education | A personal blog, a duplicate of Mason's site, or an alternate name for AURE |
| Swell agent cohort | `https://swellmarketing.agency/` | A Swell cohort designed for agents | Swell's human-facing canonical website or a `sameAs` identity |
| AURE | `https://au-re.org/` | Swell's distinct sibling organization within Arcturus Analytics Group and an optional advanced case-study subject | A parent, legal identity, or alternate name for Swell |

Allowed relationship language:

- “Swell Marketing is serviced by Mason Nguyen.”
- “Mason's research informs Swell's operating standards.”
- “Swell applies the concepts through client work, tools, and education.”
- “Swell Marketing and AURE are distinct sibling organizations within Arcturus Analytics Group.”
- “swellmarketing.xyz is Swell's human-facing website; swellmarketing.agency is its cohort designed for agents.”

Do not use `sameAs` between Mason and Swell, between Swell and AURE, or between Swell's human site and its agent cohort. Use `author`, `creator`, `memberOf`, `subOrganization`, `subjectOf`, or a plain editorial statement only when it expresses the verified relationship.

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
6. Keep `swellmarketing.xyz` as Swell's human-facing canonical domain in Swell-controlled schema and files.
7. Label `swellmarketing.agency` as the agent cohort; never include it in Swell's `sameAs` array.
8. Review both sites after any entity, domain, service-provider, or group relationship changes.

## 6. Swell anti-slop gate

Before publishing:

- [ ] The page serves Swell's applied role.
- [ ] The page names its audience and decision.
- [ ] Any Mason-owned concept links to its canonical source.
- [ ] Claims are sourced, qualified, or labeled as methodology.
- [ ] The page includes acceptance criteria or a concrete next step.
- [ ] The page does not repeat an article already owned by Mason.
- [ ] Mason and Swell use distinct schema identifiers.
- [ ] Arcturus Analytics Group is the container and is not assigned an unapproved URL.
- [ ] Only Swell and AURE are represented as members of Arcturus Analytics Group.
- [ ] AURE is represented as Swell's sibling, not its parent, alias, or legal identity.
- [ ] `.agency` is represented as Swell's agent cohort, not as a `sameAs` identity.
- [ ] Local routes and fragments pass validation; material external sources are reviewed separately.
- [ ] The page adds signal rather than publishing for volume.

Run both local publishing gates from the site root:

```bash
node scripts/check-links.mjs
node scripts/check-signal-quality.mjs
```

`check-links.mjs` validates page structure, local routes, fragments, duplicate IDs, and JSON-LD syntax. `check-signal-quality.mjs` validates the CTA contract, entity boundaries, public operating artifacts, visible/schema FAQ parity, embedded scripts, retired claim patterns, and crawler-policy decisions.

## 7. Measurement

Measure each entity separately, then measure the bridge:

- Mason: citations to Mason, framework attribution, concept adoption, and branded probe accuracy.
- Swell: qualified audit starts, discovery conversations, plan fit, enrollment handoffs, and organizational citation accuracy.
- Bridge: referral paths from Mason research to Swell application pages and backlinks from Swell to canonical Mason sources.

Shared growth is healthy only when attribution remains accurate.

## 8. Blue-ocean operating strategy

Swell does not compete on content volume, schema installation, or generic “AI SEO” retainers. Its category wedge is **representation operations**: continuously reducing the gap between what a brand can prove and how answer systems represent it.

The operating unit is a **representation gap**, not a keyword. A representation gap has four parts:

1. A commercially relevant question.
2. The answer the brand can support with evidence.
3. The answer an AI system currently gives.
4. The smallest verified intervention that can reduce the difference.

### Eliminate–reduce–raise–create

| Eliminate | Reduce | Raise | Create |
|---|---|---|---|
| Unsupported citation promises | Undirected content volume | Evidence and provenance standards | Representation-gap maps |
| Entity-mixing “ecosystem” language | Repeated GEO definitions | Query-level answer measurement | Constraint-ranked intervention queues |
| Decorative metrics and synthetic proof | Tool-first prescriptions | Acceptance criteria and verification | Evidence-to-answer operating loops |
| Retainers without a baseline | Generic service menus | Clear ownership of concepts and artifacts | Governance for human-and-agent publishing |

### Swell-owned applied artifacts

These are the defensible application layer. Each must be a usable deliverable, not merely a named idea:

- **Representation Baseline:** a versioned record of answer accuracy, inclusion, citations, and competitors across a stable query portfolio.
- **Entity Boundary Map:** canonical identifiers, verified relationships, prohibited equivalences, and cross-site ownership.
- **Evidence Ledger:** important claims mapped to first-party proof, independent corroboration, page locations, owners, and review dates.
- **Constraint Queue:** gaps ranked by business relevance, causal impact, effort, dependency, and acceptance criteria.
- **Answer Change Log:** interventions connected to later observed answer changes without claiming unsupported causality.

### Publishing rule

Every new Swell resource must contribute a reusable diagnostic, template, acceptance test, benchmark method, or governed workflow to one of those artifacts. If it only restates what GEO is, predicts the future, or repeats a Mason-owned concept, do not publish it on Swell.

### Commercial sequence

The offer architecture should follow the work:

1. Free self-audit: helps a team recognize a likely representation gap.
2. Paid diagnostic: produces the Representation Baseline, Entity Boundary Map, and ranked Constraint Queue.
3. Managed program: closes selected gaps and maintains the Evidence Ledger and Answer Change Log.
4. Academy: teaches teams and agents to operate the same system with explicit quality gates.

## 9. Known cross-site reconciliation item

As of 2026-08-08, Mason's live `llms.txt` and homepage schema refer to `swellmarketing.agency` as if it were Swell's primary identity and group Swell inside the AURE ecosystem. The approved model is different: Arcturus Analytics Group is the container; Swell and AURE are distinct siblings; `swellmarketing.xyz` serves humans; and `swellmarketing.agency` is Swell's cohort designed for agents. The Mason repository needs a coordinated update before the cross-site entity lock is complete.
