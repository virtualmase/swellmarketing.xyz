# HubSpot Free Operating Layer

HubSpot Free is the commercial source of truth. Use native records, activities, tasks, meetings, templates, and saved views; do not add another platform merely to imitate paid workflows.

## Daily queue

Start in Sales > Tasks and work in this order:

1. Explicit opt-out or suppression work.
2. New request response tasks due or overdue.
3. Qualified opportunity follow-up.
4. Meetings inside 24 hours without a discovery brief.
5. Open opportunities without a future next action.

Complete a task only after the action occurred or the record contains a factual reason it is no longer required.

## Saved views

Create these private views first; promote them to shared views only if another operator joins.

### Contacts — Swell new requests

- Contact owner is Mason Nguyen.
- Swell do not contact is not Yes.
- Swell next action is known.
- Sort by Swell next action due ascending.

### Contacts — Swell suppression

- Swell do not contact is Yes.
- Use only for suppression verification; never as an outreach list.

### Deals — Swell open pipeline

- Deal owner is Mason Nguyen.
- Deal stage is none of Closed won, Closed lost.
- Show amount, stage, Swell fit, recommended offer, next action, and next-action due.

### Deals — Missing next action

- Deal stage is open.
- Swell next action is unknown, or Swell next action due is before today.

## Free-tier sales motion

- Use CRM email templates as human-reviewed starting points from `docs/SALES_SEQUENCE_LIBRARY.md`.
- Do not simulate sequences with bulk sends. A task is the control; a logged one-to-one email is the evidence.
- A booked meeting does not automatically mean qualified.
- Create a deal only after qualification. The integration enforces this for normalized events.
- Closed won requires human confirmation of the agreement and required initial payment.

## Fulfillment handoff

When a deal becomes Closed won:

1. Complete `docs/CLIENT_HANDOFF_TEMPLATE.md` from verified CRM facts.
2. Confirm agreement, initial payment, primary contact, scope, exclusions, access owner, and kickoff date.
3. Create the kickoff and access tasks in HubSpot and associate them with the contact, company, and deal.
4. Keep promises and acceptance evidence in the deal note; keep working artifacts in the approved delivery workspace.
5. Do not move confidential client material into Vapi prompts or ordinary CRM notes.

## Reporting cadence

Run `node scripts/hubspot-gtm-report.mjs` each Monday before pipeline review. Copy the snapshot into `docs/GTM_SCORECARD_TEMPLATE.md` and add interpretation, decisions, owner, and due date. Counts without a decision are not a review.

Weekly review covers new requests, response SLA, meetings, qualified pipeline, proposals, wins/losses, overdue tasks, ownerless records, missing next actions, and suppression exceptions. Monthly review adds source quality, offer mix, cycle time, win/loss themes, and answer-change evidence.
