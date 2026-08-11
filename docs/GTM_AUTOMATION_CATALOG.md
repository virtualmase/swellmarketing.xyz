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
| `engagement_handoff_v1` | `closed_won_v1` confirmed | One verified scope; no engagement exists for opportunity + scope version | Create engagement; transfer commercial facts; queue delivery acceptance and kickoff | Delivery owner | Opportunity ID + scope version |
| `onboarding_control_v1` | Engagement enters onboarding or an input changes | Handoff accepted; communication permission exists | Validate required inputs; create owned requests/tasks; advance only after every exit requirement passes | Delivery owner | Engagement ID + onboarding version + input revision |
| `campaign_approval_v1` | Versioned brief submitted | Scope, evidence, audience, consent, budget, measurement, stop conditions, and approver are present | Bind approval decision to exact brief version; invalidate it after a material change | Campaign owner | Campaign ID + brief version + approval request ID |
| `campaign_launch_v1` | Approved campaign reaches launch time | Approval still valid; assets/tracking pass; suppression checked; rollback owner present | Execute destination launch; confirm live state; record platform evidence; otherwise dead-letter | Campaign owner | Campaign ID + approved brief version + scheduled launch |
| `campaign_stop_v1` | Approved stop condition fires | Matching live/scheduled campaign and current policy version | Pause destination execution; preserve observations; alert owner; open decision task | Campaign owner | Campaign ID + stop event ID |
| `delivery_acceptance_v1` | Deliverable submitted for acceptance | Work item, scope version, acceptance criteria, QA, and artifact version exist | Request review; record accepted/rejected result and evidence; reopen rejected work | Delivery owner | Work item ID + artifact version + review request ID |
| `client_health_v1` | Daily event evaluation and weekly review | Current delivery, response, issue, outcome, payment, and relationship signals available | Compute evidence-backed suggested health; alert on red; human confirms overrides | Client owner | Engagement ID + date + health-policy version |
| `renewal_prepare_v1` | Term end enters renewal window | Outcome summary, scope variance, economics, client health, and open issues available | Draft renewal decision brief and tasks; do not send or change terms without approval | Client owner | Engagement ID + term end + scope version |
| `private_feedback_v1` | Delivery accepted/completed | No material open acceptance issue; permitted communication channel | Send neutral approved feedback request; route issues to recovery | Client owner | Engagement ID + acceptance event ID |
| `public_review_v1` | Neutral private-feedback step completed | Delivery accepted; zero material open issues; review outreach permitted; sentiment is not an eligibility input | Send approved review request; never create client-authored content; log delivery/result | Client owner | Engagement ID + feedback event ID + destination |
| `post_engagement_followup_v1` | Approved 30/90-day follow-up date | Not opted out; channel and purpose permitted; no unresolved complaint | Send approved outcome check; route reply to retention, referral, expansion, or recovery | Client owner | Engagement ID + cadence day + follow-up policy version |

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
- [ ] Approval decisions are bound to immutable artifact versions and invalidated by material changes.
- [ ] Campaign execution rechecks consent, suppression, scope, budget, and stop conditions at action time.
- [ ] Access grants and removals are evidenced without copying credentials into event payloads.
- [ ] Feedback and review workflows cannot bypass unresolved-issue or permission gates.
