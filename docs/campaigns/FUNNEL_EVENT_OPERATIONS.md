# Funnel Event Operations

**Purpose:** Normalize sales milestones that occur outside the Swell contact form into the same HubSpot and aggregate-reporting system.
**Status:** Implementation complete; production property provisioning and one tagged end-to-end test remain required.

## Accepted milestones

The authenticated `POST /api/gtm-events/` endpoint accepts:

- `meeting.booked`
- `meeting.held`
- `meeting.no_show`
- `proposal.sent`
- `proposal.accepted`

It continues to accept `lead.requested_contact`, `voice.call_completed`, and `opportunity.qualified`.

Each event requires a globally unique `eventId`, an ISO-8601 `occurredAt`, and a contact email or phone. The sender must use `Authorization: Bearer <GTM_WEBHOOK_SECRET>`. Never place the secret in a browser, scheduling URL, CRM note, or client-side automation.

Minimal example:

```json
{
  "eventId": "meeting_01J6EXAMPLE",
  "eventType": "meeting.held",
  "occurredAt": "2026-08-19T18:00:00.000Z",
  "sourceSystem": "hubspot_workflow",
  "contact": {
    "email": "buyer@example.com"
  },
  "opportunity": {
    "nextAction": "Send the agreed written scope",
    "nextActionAt": "2026-08-21T18:00:00.000Z"
  }
}
```

The adapter records the immutable event ID for duplicate suppression, writes the relevant milestone timestamp, creates an associated note, and creates an owner task when `HUBSPOT_OWNER_ID` is configured. Milestone-only events do not create deals and do not erase an existing source, fit, offer, or consent value when those fields are absent.

## Production setup

1. Run the existing HubSpot setup script with an authorized private-app token to provision the five new contact properties from `data/hubspot-manifest.json`.
2. In an owner-controlled HubSpot workflow or trusted server integration, send `meeting.booked` only after a booking is confirmed.
3. Send exactly one terminal meeting outcome: `meeting.held` or `meeting.no_show`. A cancellation is neither and should not be counted as a held meeting.
4. Send `proposal.sent` only for a dated, versioned commercial scope delivered to the buyer.
5. Send `proposal.accepted` only when acceptance evidence is recorded. Payment and closed-won remain separate CRM evidence.
6. Use stable source-system identifiers when constructing event IDs so retries remain idempotent.

## Verification packet

For one internal tagged booking, preserve:

- scheduling confirmation and campaign parameters;
- the HubSpot contact and owner, inspected privately;
- one `meeting.booked` event response;
- either a held/no-show event response or a documented cancellation;
- the milestone timestamps in HubSpot;
- the aggregate `/api/mason-report/` funnel counts before and after;
- confirmation that a retry returns `duplicate` and does not create another note or task.

Do not copy contact details into campaign documentation or aggregate reports. The aggregate report returns counts only: booked meetings, held meetings, no-shows, proposals sent, and proposals accepted.

## Interpretation limits

These fields count unique Swell contacts with at least one verified occurrence of each milestone, not the total number of repeated meetings or proposal revisions. They are appropriate for the first-client campaign. If repeat-cycle volume becomes material, replace this contact-level summary with a governed event store or association-aware HubSpot reporting rather than treating the counts as event totals.
