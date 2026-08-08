# GTM Automation Catalog

Each workflow must preserve `eventId`/`source_event_id`, write its version, and fail visibly. “Sent,” “booked,” “updated,” or “won” may be stated only after destination confirmation.

| ID | Trigger | Preconditions | Actions | Failure owner | Idempotency key |
|---|---|---|---|---|---|
| `lead_capture_v1` | Valid website request | Response consent; honeypot empty | Upsert contact/company; create lead activity; assign owner; set 10-minute response task | Commercial owner | Website `eventId` |
| `calendar_booked_v1` | HubSpot meeting created | Valid contact; meeting belongs to Mason's canonical scheduling page | Associate contact and meeting; advance only from verified state; preserve HubSpot confirmation | Commercial owner | HubSpot meeting ID |
| `calendar_canceled_v1` | HubSpot meeting canceled | Matching meeting exists | Mark meeting canceled; create follow-up task; do not erase history | Commercial owner | HubSpot meeting ID + cancellation timestamp |
| `vapi_call_report_v1` | Vapi end-of-call report | Assistant/version allowlisted | Upsert contact when identifier exists; store transcript link/summary; validate structured output; create call activity; route opt-out immediately | Commercial owner | Vapi call ID |
| `vapi_opt_out_v1` | Structured output `doNotContact=true` or explicit transcript event | Caller identity available | Create append-only opt-out event; suppress approved outreach systems; alert owner on any failure | Commercial owner | Vapi call ID + `opt_out` |
| `qualified_lead_v1` | Human approves qualification | Required evidence and consent fields complete | Create/update opportunity; set stage qualified; create discovery next action | Commercial owner | Opportunity ID + stage version |
| `proposal_sent_v1` | Versioned proposal sent | Discovery complete; decision step scheduled | Attach proposal version; set amount/offer/decision date; stage proposal | Commercial owner | Proposal ID + version |
| `closed_won_v1` | Verified agreement and required initial payment | Human or verified billing/contract evidence | Mark won; create engagement; instantiate handoff checklist; schedule kickoff tasks | Commercial owner | Opportunity ID + agreement/payment IDs |
| `stale_pipeline_v1` | Daily schedule | Open record lacks future next action or exceeds stage-age policy | Create exception task; never auto-close without policy | Commercial owner | Record ID + date |
| `scorecard_refresh_v1` | Weekly/monthly schedule | Source sync complete; data-quality tests pass | Recompute funnel, conversion, velocity, source, offer, quality metrics | Commercial owner | Period + schema version |

## Required dead-letter fields

- Workflow ID and version
- Source event ID
- Record identifiers
- Attempt count and timestamps
- Last error category and sanitized message
- Payload location or replay reference
- Owner
- Next retry or manual resolution
- Resolution evidence

## Quality gate

- [ ] Every workflow has a test fixture for success, duplicate, invalid input, destination rejection, retry, and opt-out where relevant.
- [ ] Secrets are held by the deployment platform, not source files or payload logs.
- [ ] Personal data is excluded from general error logs unless operationally required and access-controlled.
- [ ] Stage-changing workflows enforce canonical exit fields.
- [ ] Human-only decisions remain human-only.
- [ ] Failed events have a visible owner and replay path.
