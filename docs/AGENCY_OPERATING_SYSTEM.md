# Swell Autonomous Agency Operating System

## Outcome

Swell operates one traceable lifecycle from market signal to advocacy:

`signal → lead → qualified opportunity → agreement/payment → handoff → onboarding → strategy → campaign/delivery → acceptance → renewal/offboarding → private feedback → permitted review/referral`

`data/gtm-operating-model.json` remains the commercial source of truth. `data/agency-operating-model.json` is the machine-readable source of truth from closed won through delivery, client success, and advocacy. This document is the human operating contract between them.

Autonomy means the system advances verified work inside approved boundaries. It does not mean an agent invents evidence, consent, scope, access, performance, or commercial authority.

## Control plane

The agency control plane evaluates CRM, contract/payment, project, campaign, analytics, and feedback events. It emits an idempotent action queue with one of three authority classes:

| Authority | Meaning | Examples |
|---|---|---|
| Autonomous | Reversible internal work or a documented safety stop | Research, classify, draft, create task, monitor, report, pause on stop condition |
| Policy-bound | External execution already covered by consent, approved content, scope, and channel rules | Transactional confirmation, onboarding reminder, approved campaign launch, approved follow-up |
| Human approval required | A material commitment, permission, or expansion | Price/scope, contract, credentials, strategy, first launch, budget expansion, public client use |

Every action needs an ID, workflow/version, source event, record ID, reason, due time, owner, authority, result, and destination evidence. A failed action goes to a visible dead-letter queue; it never vanishes or reports success.

The pure policy engine in `lib/agency-orchestrator.js` currently validates lifecycle transitions and builds the next-action queue. Connectors execute those actions only after revalidating authority and destination state.

## Canonical records

### Commercial records

Contact, company, opportunity, consent, attribution, and activity follow `docs/CRM_DATA_DICTIONARY.md`. The CRM owns commercial state through close.

### Engagement

The engagement links the signed opportunity to fulfillment. It owns scope version, stakeholders, access register, success plan, delivery owner, dates, client health, next action, renewal state, acceptance, feedback, and offboarding.

### Campaign

A campaign is a governed delivery container, not just an ad-platform object. It owns a versioned brief, objective, audience, approved claims, channels, budget, assets, tracking, stop conditions, launch evidence, observations, decisions, and learning.

### Work item

Every unit of delivery has an owner, due date, scope version, acceptance criteria, status, and completion evidence. “Done” without acceptance evidence is not accepted.

### Activity/event

Events provide append-only provenance between systems. Corrections create new events; they do not rewrite consent, approval, spend, acceptance, or client-feedback history.

## Lifecycle gates

### 1. Acquisition

- Generate demand from an approved ICP, offer, claim set, channel, and outreach policy.
- Preserve first and latest attribution.
- Route inbound requests within SLA and suppress opt-outs immediately.
- Qualify on observed problem, consequence, authority, evidence access, timing, investment, and method fit.
- Keep proposals versioned and attach a scheduled decision step.

### 2. Close and fulfillment handoff

- Closed won requires verified agreement and the payment condition stated in that agreement.
- Create exactly one engagement per sold scope/version.
- Transfer promises, exclusions, unknowns, stakeholders, evidence, and acceptance criteria within 24 hours.
- Delivery accepts the handoff or records a discrepancy before onboarding begins.

### 3. Onboarding

- Confirm the client owner, working team, approvers, communication rhythm, escalation path, and decision SLA.
- Maintain an access register with system, minimum role, grantor, recipient, grant/expiry dates, and removal evidence. Never store secrets in the register.
- Validate the measurement baseline before claiming improvement.
- Agree on the success plan and first 30-day plan.
- Onboarding exits only when required inputs are verified, not when a kickoff call occurred.

### 4. Strategy and production

- Translate the signed outcome into an approved strategy and scoped campaign briefs.
- Generate work items with acceptance criteria and dependency links.
- Agents may research and draft; new public claims and strategy require approval.
- QA checks factual support, scope, brand, consent, links/tracking, accessibility, privacy, and rollback readiness.

### 5. Campaign launch and management

- Launch only the approved brief version after tracking and asset validation.
- Record the destination/platform confirmation before marking live.
- Monitor objective and guardrail metrics, spend, tracking integrity, comments/feedback, and documented stop conditions.
- Agents may optimize only inside approved claim, audience, geography, channel, experiment, and spend bounds.
- A stop condition pauses execution immediately, preserves evidence, and alerts the owner.

### 6. Reporting, health, and renewal

- Reports separate observed fact, inference, unknown, decision, owner, and next review date.
- Client health is green, yellow, or red based on documented signals; it is not a sentiment guess.
- Begin renewal preparation 30 days before term end with outcomes, limitations, remaining opportunity, capacity, economics, and a human-approved recommendation.
- Scope expansion becomes a versioned commercial change; it is not hidden inside delivery.

### 7. Completion, feedback, and advocacy

- Confirm acceptance, deliver final artifacts, reconcile access, and document retention/disposition.
- Request private feedback neutrally after acceptance.
- Negative or unresolved feedback starts service recovery, not a public review request.
- Apply one neutral review-request policy regardless of sentiment. The feedback step must be complete, material service issues resolved, and outreach permission recorded; never selectively solicit only satisfied clients.
- Testimonials, names, logos, results, and case studies each require explicit written usage permission.
- Schedule permitted 30- and 90-day follow-up for outcomes, referrals, expansion, and new needs.

## Operating queues

### Continuous

1. Consent and safety exceptions.
2. Campaign stop conditions and spend/tracking anomalies.
3. New lead and client-response SLAs.
4. Blocked fulfillment and approval dependencies.
5. Scheduled launches and client deliverables.

### Daily

- Process new requests, tasks due, approvals, blocks, failures, and client questions.
- Verify every open record has an owner, next action, and due date.
- Review campaign spend and tracking integrity.

### Weekly

- Review pipeline, onboarding aging, delivery capacity, work acceptance, campaign decisions, client health, renewal risk, and automation exceptions.
- Choose one system constraint to improve and assign an owner and review date.

### Monthly

- Review source-to-revenue, gross margin, capacity, on-time acceptance, time to first value, objective and guardrail performance, retention, expansion, feedback, and referrals.
- Reconcile actual system permissions, data retention, templates, public offers, and agent authority with the canonical models.

## Minimum launch gates

Do not call the agency autonomous until all are true:

- Commercial and delivery identifiers reconcile across systems.
- Contract/payment verification creates one idempotent engagement and handoff.
- Onboarding, campaign, work-item, acceptance, feedback, and access records have enforced schemas.
- Every external executor confirms destination success and writes evidence.
- Consent and suppression are checked at execution time, not only when work is queued.
- Campaign budget, scope, quality, tracking, and stop conditions are enforced.
- Approval decisions are version-bound and expire when the underlying artifact changes.
- End-to-end tests cover duplicates, invalid state, rejection, timeout, replay, suppression, budget stop, scope change, negative feedback, and access removal.

## Build sequence

1. **Control plane:** deploy the lifecycle policy engine, immutable event envelope, action/dead-letter queues, and operator dashboard.
2. **Closed-won path:** connect verified contract/payment events to handoff, onboarding, workspace creation, and access/evidence requests.
3. **Delivery factory:** create strategy, campaign, work-item, QA, approval, launch, measurement, and reporting adapters.
4. **Client success:** add health, renewal, offboarding, feedback, review eligibility, referral, and follow-up workflows.
5. **Scale:** add capacity planning, unit economics, multi-client isolation, connector health, evaluation sets, and disaster recovery.
