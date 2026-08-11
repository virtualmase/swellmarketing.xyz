# CRM Data Dictionary

This is the vendor-neutral schema for HubSpot, Airtable, Pipedrive, or another selected system of record. Field names are stable integration keys; display labels may change.

## Contact

| Field | Type | Required | Notes |
|---|---|---:|---|
| `contact_id` | UUID/string | Yes | CRM-generated immutable identifier |
| `first_name` | Text | At qualification | Never infer |
| `last_name` | Text | No | Never infer |
| `email` | Email | For email follow-up | Normalize lowercase; retain original in activity if necessary |
| `phone_e164` | Text | For calling/SMS | E.164 format; do not overwrite with an unverified value |
| `job_title` | Text | No | Buyer-supplied or source-attributed |
| `company_id` | Relation | At qualification | Links contact to company |
| `preferred_channel` | Enum | Before follow-up | `email`, `phone`, `sms`, `none`, `unknown` |
| `consent_status` | Enum | Yes | `unknown`, `requested_contact`, `consented`, `legitimate_interest_review`, `opted_out` |
| `consent_scope` | Multi-enum | When consented | `sales_call`, `email`, `sms`, `marketing` |
| `consent_source` | Text | When consented | Form, call, booking, import, or other evidence |
| `consent_at` | Datetime | When consented | UTC |
| `opt_out_at` | Datetime | When opted out | UTC; process immediately |
| `opt_out_source` | Text | When opted out | Exact system/activity that received request |

## Company

| Field | Type | Required | Notes |
|---|---|---:|---|
| `company_id` | UUID/string | Yes | Immutable identifier |
| `company_name` | Text | At connected | Buyer-confirmed when possible |
| `canonical_domain` | URL/domain | At connected | Normalized and deduplicated |
| `segment` | Enum | At qualification | IDs from `data/gtm-operating-model.json` |
| `industry` | Text | No | Source-attributed |
| `employee_band` | Enum | No | Do not fabricate precise headcount |
| `country` | Text | Before regulated outreach | Supports consent and calling review |
| `entity_scope` | Text | Before proposal | Organizations, products, people, or locations in scope |

## Lead/Opportunity

| Field | Type | Required | Notes |
|---|---|---:|---|
| `opportunity_id` | UUID/string | Once qualified | Immutable identifier |
| `owner` | User | Yes | Exactly one current owner |
| `lifecycle_stage` | Enum | Yes | Canonical stage ID |
| `source` | Enum | Yes | Canonical source taxonomy |
| `source_detail` | Text | No | Referrer, partner, asset, or campaign detail |
| `utm_source` | Text | No | Original-touch and latest-touch variants recommended |
| `utm_medium` | Text | No | Preserve raw input plus normalized value |
| `utm_campaign` | Text | No | Campaign identifier, not free-form interpretation |
| `utm_content` | Text | No | Creative/content identifier |
| `latest_touch` | JSON/long text | No | Most recent page, referrer, and UTM values; never overwrites original touch |
| `landing_page` | URL | No | First identified landing page |
| `referrer` | URL | No | First identified referrer |
| `trigger` | Long text | At connected | Buyer language, not seller rewrite only |
| `commercial_consequence` | Long text | At qualified | Concrete business effect |
| `first_constraint` | Enum | At connected | `entity_definition`, `crawler_access`, `evidence`, `corroboration`, `measurement`, `unclear` |
| `qualification_score` | Integer | At qualified | 0–100; overridden by explicit disqualifiers |
| `qualification_evidence` | JSON/long text | At qualified | Evidence for each dimension |
| `fit` | Enum | At qualified | `qualified`, `nurture`, `disqualified`, `unknown` |
| `recommended_offer` | Enum | At qualified | Canonical offer ID |
| `amount` | Currency | At proposal | Proposed contract value |
| `probability` | Percentage | No | Stage default, overridden only with evidence |
| `decision_process` | Long text | Before proposal | Stakeholders, steps, criteria, procurement |
| `decision_date` | Date | Before proposal | Buyer-agreed target |
| `next_action` | Text | Every open stage | One concrete action |
| `next_action_at` | Datetime | Every open stage | UTC |
| `proposal_version` | Text | At proposal | Immutable version reference |
| `loss_reason` | Enum | Closed lost | Canonical taxonomy |
| `loss_notes` | Long text | Closed lost | Evidence, not blame |
| `disqualification_reason` | Text | Disqualified | Explicit boundary |

## Activity

| Field | Type | Required | Notes |
|---|---|---:|---|
| `activity_id` | UUID/string | Yes | Used for idempotency |
| `contact_id` | Relation | Yes | Primary contact |
| `opportunity_id` | Relation | No | When commercially relevant |
| `activity_type` | Enum | Yes | `form`, `diagnostic`, `email`, `call`, `meeting`, `note`, `proposal`, `contract`, `payment`, `stage_change`, `opt_out`, `automation_error` |
| `occurred_at` | Datetime | Yes | UTC event time |
| `source_system` | Text | Yes | Site, Vapi, HubSpot Meetings, CRM, billing, or manual |
| `source_event_id` | Text | Yes | Duplicate-protection key from source |
| `direction` | Enum | No | `inbound`, `outbound`, `internal` |
| `summary` | Long text | Yes | Factual activity summary |
| `artifact_url` | URL | No | Transcript, proposal, recording, or evidence record |
| `actor_type` | Enum | Yes | `prospect`, `human`, `agent`, `automation`, `system` |
| `actor_id` | Text | No | Named user, assistant, or workflow version |

## Engagement handoff

| Field | Type | Required | Notes |
|---|---|---:|---|
| `engagement_id` | UUID/string | Closed won | Delivery identifier |
| `opportunity_id` | Relation | Closed won | Commercial provenance |
| `sold_offer` | Enum | Closed won | Canonical offer ID |
| `scope_version` | Text | Closed won | Final signed scope |
| `contract_status` | Enum | Closed won | Must be complete before kickoff |
| `initial_payment_status` | Enum | Closed won | Must meet proposal terms |
| `kickoff_at` | Datetime | Handoff | Confirmed time |
| `client_owner` | User | Handoff | Delivery owner |
| `commercial_owner` | User | Handoff | Sales owner |
| `evidence_location` | URL | Handoff | Controlled client evidence repository |
| `known_unknowns` | Long text | Handoff | Explicitly preserved |
| `promises_made` | Long text | Handoff | Must match signed scope |
| `handoff_complete` | Boolean | Handoff | Human-verified |

## Engagement operations

| Field | Type | Required | Notes |
|---|---|---:|---|
| `client_status` | Enum | Yes | `pending_handoff`, `onboarding`, `strategy_ready`, `active`, `renewal_due`, `completed`, `paused`, `offboarded` |
| `client_owner` | User | Onboarding | Accountable client-success owner |
| `client_health` | Enum | Active | `green`, `yellow`, `red`, `unknown`; evidence and override history required |
| `communication_plan` | URL/relation | Onboarding | Approved channels, cadence, hours, response SLA, and escalation |
| `stakeholder_map` | URL/relation | Onboarding | Roles, decision rights, and approval responsibilities |
| `access_register` | URL/relation | Onboarding | Metadata and removal evidence only; never credentials |
| `baseline_plan` | URL/relation | Onboarding | Versioned starting state and measurement method |
| `success_plan` | URL/relation | Onboarding | Outcome, primary and guardrail metrics, acceptance, first value |
| `first_30_day_plan` | URL/relation | Onboarding | Owned milestones, dependencies, dates, and acceptance evidence |
| `next_milestone` | Text | Every open stage | One client-visible milestone |
| `next_milestone_at` | Datetime | Every open stage | UTC |
| `term_end_at` | Datetime | Recurring work | Drives renewal decision window |
| `renewal_status` | Enum | Renewal | `not_due`, `preparing`, `proposed`, `renewed`, `declined`, `completed` |
| `delivery_accepted_at` | Datetime | Completion | Backed by acceptance activity/event |
| `open_issue_count` | Integer | Active onward | Material unresolved client issues |
| `feedback_status` | Enum | Completion | `not_eligible`, `not_requested`, `requested`, `received`, `recovery`, `closed` |
| `client_sentiment` | Enum | Feedback | `positive`, `neutral`, `negative`, `unknown`; based on client expression |
| `review_outreach_permitted` | Boolean | Before review request | Permission and channel evidence required |
| `public_review_status` | Enum | Advocacy | `not_eligible`, `not_requested`, `requested`, `completed`, `declined` |

## Campaign

| Field | Type | Required | Notes |
|---|---|---:|---|
| `campaign_id` | UUID/string | Yes | Immutable identifier |
| `engagement_id` | Relation | Yes | Owning client scope |
| `brief_version` | Text | Planned | Material changes create a new immutable version |
| `status` | Enum | Yes | Canonical campaign stage from the agency model |
| `owner` | User | Yes | Accountable operator |
| `objective` | Text | Draft exit | One decision-oriented objective |
| `audience` | JSON/URL | Draft exit | Inclusion/exclusion rules and consent basis |
| `offer` | Text | Draft exit | Approved offer and next step |
| `channels` | Multi-enum | Planned | Execution destinations |
| `budget` | Currency/JSON | Planned | Ceiling, pacing, currency, and source of truth |
| `measurement_plan` | URL/relation | Planned | Baseline, objective, guardrails, tracking, attribution, review points |
| `stop_conditions` | JSON | Planned | Machine-evaluable where possible |
| `approved_brief_version` | Text | Approved | Exact version; never assume approval carries forward |
| `approved_by` | User/contact | Approved | Authorized approver |
| `approved_at` | Datetime | Approved | UTC |
| `tracking_validation` | Enum/artifact | Scheduled | `passed`, `failed`, `unknown` plus evidence |
| `asset_validation` | Enum/artifact | Scheduled | `passed`, `failed`, `unknown` plus evidence |
| `launch_at` | Datetime | Scheduled | UTC |
| `launch_evidence` | URL/string | Live | Destination confirmation |
| `review_at` | Datetime | Live | Next decision point |
| `decision` | Enum | Review | `continue`, `change`, `stop`, `insufficient_evidence` |

## Work item and approval

| Field | Type | Required | Notes |
|---|---|---:|---|
| `work_item_id` | UUID/string | Yes | Immutable delivery identifier |
| `engagement_id` | Relation | Yes | Owning client engagement |
| `campaign_id` | Relation | No | When campaign-specific |
| `scope_version` | Text | Yes | Prevents silent scope drift |
| `owner` | User/agent | Yes | Exactly one accountable owner |
| `status` | Enum | Yes | Canonical work-item status |
| `due_at` | Datetime | Yes | UTC |
| `acceptance_criteria` | JSON/long text | Yes | Verifiable completion conditions |
| `artifact_version` | Text | Review | Immutable submitted output |
| `acceptance_evidence` | URL/relation | Accepted | Reviewer, decision, timestamp, and evidence |
| `approval_request_id` | UUID/string | Approval | Immutable approval event chain |
| `approval_status` | Enum | Approval | `requested`, `approved`, `rejected`, `expired`, `superseded` |
| `approval_scope` | JSON | Approval | Exact artifact/version and permission granted |

## Data rules

1. Never silently merge contacts solely because names match.
2. Normalize domains and E.164 phone numbers before duplicate checks.
3. Preserve original source values in activity history.
4. Treat consent and opt-out records as append-only evidence; corrections require a new dated event.
5. Agent summaries are evidence inputs, not unquestioned truth.
6. Stage changes require the canonical exit fields or an explicit human override with a reason.
7. Closed-won status requires verified agreement and payment state.
8. Every automation writes its workflow version and source event ID.
9. Commercial, engagement, campaign, work-item, and activity records share identifiers; names are never used as join keys.
10. Approval applies only to the recorded artifact version and authority scope; a material change supersedes it.
11. Credentials and raw secrets never belong in CRM, project records, event payloads, prompts, or logs.
12. Client health, sentiment, acceptance, and performance claims require dated evidence and preserve overrides.
