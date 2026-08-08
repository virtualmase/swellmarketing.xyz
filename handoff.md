# Swell GTM Session Handoff

Last updated: 2026-08-08 (America/Los_Angeles)

## Current outcome

Swell's GTM system is live on `https://swellmarketing.xyz` and validated across website demand capture, HubSpot CRM routing, HubSpot Meetings, owner/task assignment, logged one-to-one email, reporting, and the secured Vapi webhook boundary.

The operating objective was to reduce noise, increase signal, and build a complete GTM-ready sales, marketing, and operations system around Representation Operations / generative search optimization.

## Repository state

- Repository: `git@github.com:virtualmase/swellmarketing.xyz.git`
- Working directory: `/home/brimstone/swell/site`
- Branch: `codex/cohesive-home-footer`
- Pushed commit: `4a9d6a6` — `Build production GTM and HubSpot operations system`
- Pull request has not been opened or merged.
- PR URL: `https://github.com/virtualmase/swellmarketing.xyz/pull/new/codex/cohesive-home-footer`
- This `handoff.md` was created after that commit and is initially uncommitted.

Before changing anything next session:

```bash
cd /home/brimstone/swell/site
git status --short
git branch --show-current
git log -1 --oneline
```

## Production infrastructure

### Vercel

- Team/project: `coreweaver-labs/swellmarketing-xyz`
- Production alias: `https://swellmarketing.xyz`
- Local link metadata uses `.vercel/repo.json`; `.vercel/` is git-ignored.
- The latest production deployment includes HubSpot owner assignment and response-task automation.

Production environment variables configured in Vercel:

- `GTM_WEBHOOK_URL=https://swellmarketing.xyz/api/gtm-events`
- `GTM_WEBHOOK_SECRET`
- `VAPI_WEBHOOK_SECRET`
- `HUBSPOT_ACCESS_TOKEN`
- `HUBSPOT_PIPELINE_ID=default`
- `HUBSPOT_STAGE_QUALIFIED=qualifiedtobuy`
- `HUBSPOT_OWNER_ID=96862940`

Never pull production environment values into the repository or paste them into chat.

### HubSpot

- Plan: Free
- Pipeline: `default` / Sales Pipeline
- Qualified stage: `qualifiedtobuy`
- Commercial owner: Mason Nguyen
- HubSpot owner ID: `96862940`
- Canonical meeting page: `https://meetings-na2.hubspot.com/mason-nguyen`
- Personal inbox `masonnguyengeo@gmail.com` is connected.
- Custom property manifest: `data/hubspot-manifest.json`
- Setup guide: `docs/HUBSPOT_SETUP.md`
- Free-tier operating guide: `docs/HUBSPOT_FREE_OPERATIONS.md`

Confirmed live behavior:

- Repeated requests update one contact rather than duplicating it.
- Form requests create contact/company activity without prematurely creating a deal.
- New requests assign Mason and create a high-priority 10-minute response task.
- Qualified normalized events create a deal and 30-minute follow-up task.
- Exact event replay does not duplicate notes, tasks, or deals.
- Explicit opt-outs persist `swell_do_not_contact=true` and a suppression action.
- HubSpot Meetings creates the calendar event and CRM timeline activity.
- One-to-one email can be sent and logged from HubSpot.

Current high-signal report after testing:

- 1 Swell-attributed contact
- 0 Swell deals
- 0 open, overdue, or ownerless Swell tasks after completing the controlled response task
- Historical non-Swell contacts are intentionally excluded from the Swell scorecard

### Vapi

- Assistant: `Swell Pipeline Concierge`
- Assistant ID: `5b29bf0d-4e97-4b09-8e4f-1d16ea725591`
- Local configuration: `vapi/swell-pipeline-concierge.json`
- Custom credential ID: `e70ad7e1-7d97-4fc2-8e5c-e1a97f60f56a` (identifier only; not the secret)
- Server URL: `https://swellmarketing.xyz/api/vapi-webhook`
- Server messages: `end-of-call-report` only
- Recording: disabled
- Maximum call duration: 360 seconds
- Assistant identifies itself as AI and cannot claim a booking, payment, transfer, CRM update, or other action without tool confirmation.
- The authenticated live webhook test returned `{"ok":true,"code":"ignored_event"}`.
- No production phone number was connected during this session. Earlier web tests had no microphone, and Vapi billing constraints prevented some text testing.

## Important implementation files

- `api/leads.js` — validates and normalizes website requests
- `api/gtm-events.js` — authenticated internal event boundary and HubSpot adapter entry
- `api/vapi-webhook.js` — authenticated Vapi end-of-call normalization
- `lib/hubspot-client.js` — HubSpot API client
- `lib/hubspot-adapter.js` — contact/company/deal/note/task routing and idempotency
- `assets/attribution.js` — session attribution capture
- `contact/index.html` — consent-aware lead form and HubSpot booking CTA
- `privacy/index.html` — operational privacy notice
- `data/gtm-operating-model.json` — canonical offers, lifecycle, qualification, and SLAs
- `docs/GTM_OPERATING_SYSTEM.md` — primary GTM operating model
- `docs/SALES_SEQUENCE_LIBRARY.md` — human-reviewed sales email copy
- `docs/CLIENT_HANDOFF_TEMPLATE.md` — closed-won fulfillment handoff
- `docs/GTM_SCORECARD_TEMPLATE.md` — review template

## Validation commands

Run after any meaningful change:

```bash
node scripts/check-gtm-system.mjs
node scripts/check-links.mjs
node scripts/check-signal-quality.mjs
git diff --check
```

Read-only HubSpot health report (requires the token in the current shell):

```bash
node scripts/hubspot-gtm-report.mjs
```

HubSpot provisioning preview:

```bash
node scripts/setup-hubspot.mjs
```

Do not rerun live fixture creation casually. Synthetic HubSpot fixtures from prior integration tests were archived successfully. `data/hubspot-test-fixtures.json` contains only the archived fixture IDs from those tests.

## Free-tier operating controls

HubSpot Free deliberately keeps these actions human-controlled:

- Sending one-to-one sales email
- Completing response tasks
- Declaring a lead qualified
- Moving deals through discovery/proposal stages
- Confirming closed won after agreement and required payment evidence
- Completing the client fulfillment handoff

Do not add another service merely to imitate paid HubSpot workflows unless volume or failure data justifies it.

## Recommended next actions

1. Review and open the pull request for `codex/cohesive-home-footer`; merge only after confirming the production branch policy and Vercel Git deployment behavior.
2. Commit this `handoff.md` if it should remain in the repository.
3. Decide whether the Vapi channel needs a production phone number. If yes, confirm Vapi billing, calling jurisdiction, consent language, number source, inbound/outbound scope, and suppression policy before provisioning.
4. Create the four saved views documented in `docs/HUBSPOT_FREE_OPERATIONS.md` if they have not yet been created manually.
5. Run `node scripts/hubspot-gtm-report.mjs` each Monday and record decisions in `docs/GTM_SCORECARD_TEMPLATE.md`.
6. For the first real qualified opportunity, validate the qualified deal/task path and use `docs/SALES_DISCOVERY_TEMPLATE.md`, `docs/PROPOSAL_TEMPLATE.md`, and `docs/CLIENT_HANDOFF_TEMPLATE.md` without inventing missing facts.

## Security and governance boundaries

- Never commit `.env`, `.env.local`, `.vercel/`, Vapi API keys, HubSpot tokens, or webhook secrets.
- Vapi private/static credentials belong only in local secret storage or the relevant platform secret store; a public Vapi key is not sufficient for server-side administration.
- Response consent is distinct from optional marketing consent.
- Every outbound system must honor `swell_do_not_contact` and channel-specific consent.
- Recording remains disabled unless notice, consent, retention, and jurisdictional requirements are deliberately implemented.
- Closed won requires human confirmation; no agent may infer revenue from a meeting, proposal, or verbal interest.
