# HubSpot Production Setup

HubSpot is Swell's selected CRM system of record. The website and Vapi emit normalized events; `/api/gtm-events` owns the HubSpot mapping. Do not send browser or Vapi traffic directly to HubSpot.

## 1. Create the HubSpot account and app

Create or select the Swell HubSpot account. Create a static/private app installed only in that account. Grant the minimum scopes needed to:

- Read/write contacts
- Read/write companies
- Read/write deals
- Read/write notes
- Read/write CRM schemas/properties for contacts and deals during setup
- Read deal pipelines
- Create default CRM associations

HubSpot's exact scope labels can change by developer-platform version. Review the installation screen and reject unrelated CMS, marketing-send, payment, ticket, or sensitive-data access. The adapter does not need those capabilities.

Store the token as `HUBSPOT_ACCESS_TOKEN` in local deployment secrets and Vercel. Never paste it into source, a public key, browser JavaScript, Vapi prompts, or a CRM note.

## 2. Create canonical properties

Preview the manifest locally:

```bash
node scripts/setup-hubspot.mjs
```

After setting `HUBSPOT_ACCESS_TOKEN` in the current shell, apply the missing properties:

```bash
node scripts/setup-hubspot.mjs --apply
```

The script is idempotent: it inspects each property and creates only missing ones. It does not delete or replace properties and does not alter pipelines. It then prints available pipeline and stage IDs.

## 3. Configure the deal pipeline

Use a dedicated “Swell GTM” deal pipeline if the HubSpot plan permits it. Otherwise map the canonical Swell stages onto the account's single available pipeline without deleting records or stages used by another process.

Required opportunity stages:

- Connected
- Qualified
- Discovery complete
- Proposal
- Verbal commitment
- Closed won
- Closed lost

Lead, nurture, and disqualified states may remain contact-level states until an opportunity meets the deal-creation rule. The adapter creates a deal only when `fit=qualified`.

Set:

```env
HUBSPOT_PIPELINE_ID=<selected-pipeline-id>
HUBSPOT_STAGE_QUALIFIED=<qualified-stage-id>
```

Closed won remains human-controlled and requires agreement plus required initial payment evidence.

## 4. Connect the normalized event endpoint

Generate a high-entropy `GTM_WEBHOOK_SECRET`. In Vercel, set:

```env
GTM_WEBHOOK_URL=https://swellmarketing.xyz/api/gtm-events
GTM_WEBHOOK_SECRET=<shared-internal-bearer-secret>
HUBSPOT_ACCESS_TOKEN=<hubspot-static-token>
HUBSPOT_PIPELINE_ID=<pipeline-id>
HUBSPOT_STAGE_QUALIFIED=<stage-id>
```

`/api/leads` and `/api/vapi-webhook` send normalized events to this destination. `/api/gtm-events` verifies the bearer secret before making HubSpot calls.

## 5. Connect Vapi

Generate a separate high-entropy `VAPI_WEBHOOK_SECRET`. Store it in Vercel. In Vapi, create a server credential that sends:

```text
Authorization: Bearer <VAPI_WEBHOOK_SECRET>
```

Set the assistant server URL to:

```text
https://swellmarketing.xyz/api/vapi-webhook
```

Subscribe only to `end-of-call-report` until another event has a documented consumer. The endpoint allowlists the Swell Pipeline Concierge assistant ID and ignores non-terminal events.

## 6. Configure views and ownership

Create saved views for:

- New leads due inside the response SLA
- Open opportunities without a future next action
- Qualified opportunities by decision date
- Proposals with a decision date inside seven days
- Do-not-contact records
- Automation errors/replay queue
- Closed-won handoffs incomplete after 24 hours

Assign one commercial owner. Do not leave imported or agent-created records ownerless.

## 7. Validate before launch

Run locally:

```bash
node scripts/check-gtm-system.mjs
node scripts/check-links.mjs
node scripts/check-signal-quality.mjs
```

Then submit a synthetic lead using a controlled `@example.com` address or a designated internal test address and verify:

1. One contact exists.
2. One company exists and is associated.
3. One activity note contains the event ID and factual summary.
4. Replaying the same event does not create another note or deal.
5. A qualified event creates one associated deal in the Qualified stage.
6. An explicit opt-out sets `swell_do_not_contact=true` and creates the suppression next action.
7. Failed events are visible in Vercel logs and can be replayed from a controlled source.

Delete synthetic records after validation if they are not part of a retained test fixture.

## Operating boundary

HubSpot is the commercial source of truth, but it is not permission to contact. Every outbound system must check the Swell suppression property and the channel-specific consent record. Optional marketing consent is distinct from permission to answer a submitted request.
