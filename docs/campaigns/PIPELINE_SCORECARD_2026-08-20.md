# Name-Change Representation Campaign Scorecard

## Period control

- Reporting period: 2026-08-20 through 2026-09-18
- Prepared at: 2026-08-19
- Data cutoff: 2026-08-19
- Campaign: `name_change_representation_q3_2026`
- Commercial owner: Mason Nguyen
- Source versions: GTM operating model 1.0.0 with private-scoped Baseline policy; research queue reviewed 2026-08-19
- Known limitation: No live HubSpot read was available in the local shell. The last repository handoff reported one Swell-attributed test contact and zero Swell deals; these are not counted as campaign demand.

## Campaign funnel

| Metric | Current | 30-day target | Evidence | Next decision |
| --- | ---: | ---: | --- | --- |
| Candidate accounts | 8 | 10 | Research queue | Add only when first-party trigger evidence passes |
| Completed account packets | 5 | 10 | First cohort complete: Airspeed, Crosstie, BlueDolphin, CWILL, Illumia | Run cohort decision review |
| Partner candidates | 5 | 5 qualified conversations | Stripe Directory research queue; capability unverified | Manually qualify direct candidates before any approach |
| Consented partner introductions | 0 | Initial target 2 | CRM/referral record required | Use partner brief and explicit introduction permission |
| Versioned observations | 0 | 5 | No preserved answer runs | Run only with documented conditions |
| Accounts with permitted contact path | 0 | 5 | Permission fields in packets | Change distribution if still zero after five packets |
| Contextual attempts | 0 | 5 | CRM/activity record required | No contact until permission exists |
| Connected buyer conversations | 0 | 5 | Verified two-way conversation | Review message after first three |
| Fit reviews held | 0 | 3 | Completed meeting record | Track held, no-show, and cancelled separately |
| Qualified opportunities | 0 | 2 | Qualification evidence plus human decision | Preserve buyer language |
| Written scopes | 0 | 1–2 | Versioned proposal and decision review | No proposal without a review date |
| Closed won | 0 | 1 | Agreement and required initial payment | Handoff within 24 hours |
| Qualified pipeline | $0 | Owner-set after scoped prices | CRM open qualified deals | Baseline has no default amount |
| Closed-won revenue | $0 | Owner-set after scoped prices | CRM closed-won deals | Reconcile after reporting fix deploys |

## Quality and launch controls

| Control | Current | Required | Action |
| --- | --- | --- | --- |
| Canonical offer consistency | Pass locally | Private Baseline; Growth $2,500/mo; Scale $3,500/mo; no Starter | Keep automated check green |
| Local GTM suite | Pass | Pass | Full suite re-run after cohort and offer changes |
| Turnstile production health | Failing as of 2026-08-19 | Both keys configured and challenged submission verified | Configure in Vercel and redeploy |
| Production deployment | Ready | Current verified build | `dpl_2j5UtHbSsgeEjBAriLZyC8hmvQof`; contact fallback verified live |
| Privacy-minimal funnel events | Live | CTA, diagnostic completion, confirmed lead save | `dpl_J42JBPr6bVj5qr2Yi6TVFScQFQhK`; production source verified |
| Partner inbound surface | Live | Partner fit, handoff, boundaries, tracked contact path | `/partners/`, deployment `dpl_7wsQBL2ifPUjaijfuGzUN9rgm1Qs` |
| Form-to-HubSpot proof | Missing | One tagged end-to-end transaction | Execute after Turnstile setup |
| Meeting lifecycle proof | Partial | Tagged book/cancel/ownership verification | Run internal test |
| Unsupported account allegations | 0 | 0 | Human review every packet/observation |
| Contact without basis | 0 | 0 | Permission and suppression check before every attempt |
| Open records without next action | Unknown | 0 | Confirm with live HubSpot report |

## Current constraint

- Constraint: No documented permitted distribution path exists for the five evidence-qualified accounts.
- Evidence: All five completed packets have strong public transition records and `permission: not established`.
- Intervention: Prepare a non-account-specific transition failure-pattern asset and identify consented partner, event, inbound, or referral routes.
- Owner: Mason Nguyen
- Review: after ten permitted referral, partner, event, or owner-approved publication actions; three connected conversations; or fourteen days, whichever occurs first
- Decision: segment and research method retained; distribution changed to permission generation. See `FIRST_COHORT_DECISION_2026-08-19.md`.

## Immediate queue

1. Configure production Turnstile and verify one tagged form submission.
2. Deploy the CRM aggregate-reporting and canonical offer-model changes.
3. Run the 15 versioned research questions for the first cohort under recorded conditions.
4. Prepare the non-account-specific representation-transition asset.
5. Manually qualify the five-candidate partner queue in `PARTNER_REFERRAL_CHANNEL.md`; do not infer contact permission.
6. Identify an existing relationship, event, or referral basis for the first permitted distribution actions; do not scrape contacts.
