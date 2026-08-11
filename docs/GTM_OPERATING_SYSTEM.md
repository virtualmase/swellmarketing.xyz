# Swell GTM Operating System

## Purpose

This document is the human operating contract for taking a buyer from first signal through revenue and delivery. The machine-readable source of truth is `data/gtm-operating-model.json`. Site copy, Vapi prompts, CRM fields, automations, reporting, and sales behavior must not contradict it.

## Commercial thesis

Swell sells Representation Operations: the disciplined work of closing the gap between what a company can prove and what AI products say about it. The wedge is a paid baseline, not a promise of rankings. Managed work begins only when a credible baseline or equivalent evidence record exists.

## Primary buyer

Prioritize B2B software, professional-service, and technical companies when all of the following are plausible:

- Buyers use search or AI products to research vendors.
- An inaccurate, outdated, absent, or weakly corroborated representation has a commercial consequence.
- The company can provide evidence and access to someone who can validate it.
- A decision-maker will sponsor baseline-first work.
- The priority exists inside a 90-day window.

Multi-entity companies are a secondary segment when products, people, locations, or sibling brands are being conflated.

## Buyer journey

1. **Recognize:** A buyer observes an inaccurate answer, missing recommendation, entity conflict, or measurement blind spot.
2. **Orient:** The buyer uses the free Representation Gap diagnostic without an email gate.
3. **Raise a hand:** The buyer requests a discovery call, sends an email, or consents to a follow-up.
4. **Qualify:** Swell captures the trigger, commercial consequence, first unresolved layer, authority, evidence access, timing, investment fit, and method fit.
5. **Diagnose:** When a credible baseline does not exist, Swell proposes the commissioned Representation Baseline.
6. **Decide:** A versioned proposal states scope, exclusions, evidence obligations, acceptance criteria, price, timing, and next decision date.
7. **Handoff:** Closed-won work transfers with the full evidence and commercial record; delivery does not rediscover the sale.
8. **Learn:** Win/loss reasons, buyer language, recurring constraints, and delivery evidence update the operating system without exposing client-confidential material.

After closed won, `docs/AGENCY_OPERATING_SYSTEM.md` and `data/agency-operating-model.json` govern onboarding, campaign delivery, client success, feedback, reviews, and follow-up. The shared opportunity and engagement identifiers preserve one lifecycle rather than creating a disconnected fulfillment system.

## Pipeline definitions

The stage definitions and required exit fields live in the operating-model JSON. A stage describes verified buyer state, not seller activity. Sending an email does not make a lead “connected.” Sending a proposal does not create verbal commitment. An opportunity is closed won only after the agreement and required initial payment are complete.

Every open record must have:

- One owner
- One current stage
- One next action
- One next-action date
- One source
- One consent status
- One dated activity record

No open opportunity may remain in a stage without a future next action. The daily review corrects or closes stale records.

## Qualification and routing

Score the seven dimensions in the operating model, then apply human judgment. The score supports a decision; it does not replace one.

- **75–100:** Qualified. Schedule or complete human discovery.
- **50–74:** Nurture or route to the self-guided diagnostic, with explicit follow-up permission.
- **Below 50:** Disqualify unless a named missing fact could materially change the outcome.
- **Override:** Safety, consent, deception, spam, guarantee-seeking, or unrelated-scope conditions override the score.

Route by earliest unresolved layer:

| First constraint | Immediate next step |
|---|---|
| Entity definition | Establish canonical entities, relationships, descriptions, and identifiers |
| Crawler access | Verify access, rendered evidence, directives, sitemaps, and indexability |
| Evidence | Build the claim-to-source ledger and repair priority pages |
| Corroboration | Map relevant independent sources and legitimate authority gaps |
| Measurement | Establish a versioned query set and observed-answer baseline |
| Unclear | Commission or complete the Representation Baseline |

## Discovery agenda

A 30-minute discovery call should produce a decision, not another vague conversation.

1. Confirm the trigger in the buyer's words.
2. Quantify or concretely describe the commercial consequence.
3. Identify affected entities, markets, buyer questions, and AI surfaces.
4. Review what is known, observed, and merely assumed.
5. Confirm evidence access and internal approvers.
6. Establish timing, decision process, and investment fit.
7. Select one outcome: self-guided, paid baseline, managed-scope preparation, nurture, or disqualify.
8. Agree to the next action, owner, and date before ending.

## Proposal standard

Every proposal must include:

- Buyer problem and commercial consequence
- Defined entity, market, and query scope
- Current evidence and explicit unknowns
- Deliverables and acceptance criteria
- Buyer evidence/access obligations
- Exclusions and non-guarantees
- Timeline, governance, and review points
- Price and payment terms
- Decision date and expiration date
- Named owners and kickoff conditions

Never send a proposal without a scheduled decision step.

## Closed-won handoff

Within 24 hours of contract and required initial payment:

1. Freeze the final proposal version and commercial record.
2. Create the client workspace and engagement identifier.
3. Transfer contacts, stakeholders, trigger, consequences, scope, evidence, unknowns, risks, and promises made.
4. Confirm data access and publishing permissions separately.
5. Create kickoff agenda and evidence-request list.
6. Assign every first-week action and due date.
7. Record any gap between sold scope and delivery interpretation before work begins.

## Marketing system

Marketing exists to create and capture high-information buying signals, not maximize anonymous volume.

### Core surfaces

- **Category page:** Swell homepage and method explain Representation Operations.
- **Problem capture:** Representation Gap diagnostic identifies the first constraint without a gate.
- **Evidence assets:** Baseline, evidence ledger, and answer-change log demonstrate the method.
- **Commercial pages:** Services and pricing state fit, starting points, boundaries, and next steps.
- **Research bridge:** Mason's canonical research supplies original concepts; Swell applies them without entity conflation.

### Content decision rule

Publish only when an asset supports at least one documented buyer question, objection, evidence gap, or operating decision. Each asset needs an owner, target buyer, lifecycle purpose, canonical claim, supporting evidence, distribution plan, measurement plan, and review date.

### Campaign record

Every campaign needs:

- Hypothesis
- Target segment and account criteria
- Buyer problem and offer
- Source/medium/campaign taxonomy
- Landing destination
- Consent basis
- Primary and guardrail metrics
- Start, stop, and review dates
- Owner and budget
- Decision after review: continue, change, or stop

## Operating cadence

For the current HubSpot Free implementation, use `docs/HUBSPOT_FREE_OPERATIONS.md` as the execution layer for daily queues, saved views, fulfillment handoff, and reporting.

### Daily

- Process new leads and missed calls against response SLAs.
- Review records without a next action.
- Process opt-outs immediately.
- Inspect failed automations and agent actions.

### Weekly

- Review stage movement, aging, qualified pipeline, meetings, proposals, and losses.
- Listen to or read a sample of agent-assisted conversations.
- Extract buyer language and objections.
- Select one funnel constraint to address; do not launch unrelated activity by default.

### Monthly

- Review source-to-revenue, offer performance, sales cycle, win/loss reasons, and delivery capacity.
- Reconcile public pricing and offer definitions against the canonical model.
- Review consent, retention, access, and automation permissions.
- Feed validated learning into marketing and sales assets.

### Quarterly

- Revalidate ICP, category language, offers, economics, service capacity, and channel strategy.
- Retire assets and automations that do not influence a documented decision.

## Automation doctrine

Automate deterministic movement and evidence capture; preserve human control over judgment and commitments.

An automation may create or update records only when it has:

- A named trigger
- Idempotency or duplicate protection
- Required-field validation
- An owner for failures
- An audit trail
- A retry and dead-letter path
- A rollback or correction procedure
- A test scenario

The Vapi agent may qualify, summarize, classify, and recommend. It may not negotiate, change prices, promise results, mark revenue won, or claim an unconfirmed action.

## Launch gate

The GTM system is ready for live traffic only when:

- Lead capture records attribution and consent.
- The CRM enforces stage definitions and required exit fields.
- Every inbound route has an owner and SLA.
- Calendar, messaging, and agent actions confirm success before stating completion.
- Opt-outs persist across every outreach system.
- Proposals and closed-won handoffs use versioned templates.
- A dashboard can trace source → lead → qualified opportunity → revenue.
- End-to-end tests cover happy paths, no-shows, duplicates, failures, opt-outs, disqualification, and handoff.
