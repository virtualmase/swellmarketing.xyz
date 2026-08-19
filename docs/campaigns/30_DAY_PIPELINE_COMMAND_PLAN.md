# Swell 30-Day Pipeline Command Plan

**Campaign:** `name_change_representation_q3_2026`
**Period:** 2026-08-20 through 2026-09-18
**Commercial owner:** Mason Nguyen
**Operating decision:** Launch controlled founder-led demand creation after the production-intake gate below. Do not launch scaled or unattended outreach.

## Outcome

Create the first evidence-backed, repeatable pipeline motion for Swell Marketing by converting recent B2B software name changes into permission-based representation conversations.

The campaign optimizes for qualified pipeline and accepted written scopes, not impressions, scraped contacts, automated volume, or unsupported AI-visibility claims.

## Thirty-day targets

| Outcome | Target | Definition |
| --- | ---: | --- |
| Completed account packets | 10 | First-party trigger, current canonical record, entity map, three versioned questions, commercial hypothesis, buyer function, and permission status reviewed |
| Reproducible material observations | 5 | Preserved under documented query, surface, date, locale, and account conditions |
| Permitted contextual conversations | 5 | Two-way contact with a documented basis and no suppression conflict |
| Fit-review working sessions held | 3 | Completed, not merely booked |
| Qualified opportunities | 2 | Meets the canonical qualification threshold and human review |
| Written scopes issued | 1–2 | Versioned proposal with a scheduled decision review |
| Closed won | 1 | Agreement and required initial payment complete |

Targets are operating hypotheses, not public promises. Failure to find permitted contact paths triggers a distribution change, not unsolicited bulk outreach.

## Launch gates

### Resolved commercial policy

The Representation Baseline is privately scoped after fit review. `GEO Starter` at $1,500/month is retired and prohibited from quoting or routing. Growth remains $2,500/month and Scale remains $3,500/month. The canonical offer model, CRM adapter/manifest, public pages, and AI concierge are aligned to this policy.

### Production-intake gate

Before sending meaningful traffic to the request form:

1. Configure `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in production and redeploy.
2. Confirm `/api/health/` is healthy and `/api/public-config/` exposes the expected site key.
3. Submit one tagged internal lead and verify contact, company, note, owner, response task, consent, and attribution in HubSpot.
4. Book and cancel one tagged internal meeting and verify ownership, source visibility, cancellation history, and follow-up handling.
5. Run the aggregate GTM report after deploying the custom-pipeline reporting fix.

Until this gate closes, controlled conversations may use the verified HubSpot Meetings route with active human monitoring. Do not run paid acquisition or unattended distribution.

## Task-force lanes

### Market intelligence and account research

Owner function: research. Source of truth: `NAME_CHANGE_REPRESENTATION_RESEARCH_QUEUE.md`.

- Work the first five packets in order: Airspeed, Crosstie, BlueDolphin, CWILL, Illumia.
- Advance only accounts scoring at least 70/100 from preserved public evidence.
- Distinguish issuer claims, observations, inferences, and unknowns.
- Identify buyer roles, not scraped or guessed personal inboxes.
- Record permission and suppression separately from relevance.

### Sales conversion

Owner function: commercial. Source of truth: `REPRESENTATION_BASELINE_SALES_PLAYBOOK.md`.

- Lead with the documented transition and uncertainty, not an allegation.
- Ask permission to share the five-layer diagnostic.
- Move to a fit-review working session only after a specific problem and consequence are confirmed.
- End discovery with one of five decisions: self-guided, baseline, managed-scope preparation, nurture, or close.
- Send no proposal without a dated decision review and a clear one-time-versus-recurring price.

### Funnel and revenue operations

Owner function: revenue operations. Source of truth: `FUNNEL_CRM_LAUNCH_READINESS_2026-08-19.md`.

- Close the production intake gate.
- Keep every open record assigned with one next action and date.
- Measure held meetings, proposals, accepted scopes, pipeline value, revenue, and loss reasons.
- Reconcile meeting-created contacts because the normalized Swell report can currently omit meeting-only records.
- Treat diagnostic completion, CTA click, meeting status, and proposal status as measurement gaps until governed events or a named analytics source exists.

## Weekly execution

### Days 1–3: close gates and prepare evidence

- Configure and verify Turnstile and the end-to-end HubSpot path.
- Deploy and verify the aggregate revenue-reporting fix.
- Complete the Airspeed and Crosstie research packets.
- Create the weekly scorecard with zeroes rather than leaving unknown starting values blank.

### Days 4–7: validate the campaign hypothesis

- Complete BlueDolphin, CWILL, and Illumia packets.
- Human-review all observations and commercial-consequence hypotheses.
- Identify legitimate contact paths or mark the accounts research-only.
- Publish or prepare one non-account-specific failure-pattern asset if direct permission paths do not exist.
- Begin contextual conversations only where a valid basis exists.

### Week 2: create conversations

- Expand to five additional accounts only if the first cohort remains evidence-rich.
- Use the approved message ladder and tracked diagnostic/booking routes.
- Hold the first fit-review working sessions.
- Record buyer language, objections, qualification evidence, and next actions on the same day.
- Review whether targeting, distribution, or message is the first constraint.

### Week 3: convert qualified demand

- Complete discovery for qualified accounts.
- Recommend one scope per decision; do not manufacture tier choices.
- Send versioned proposals only with decision reviews scheduled.
- Build a mutual close plan for each proposal.
- Create one evidence asset only when a real objection or buyer question justifies it.

### Week 4: close and learn

- Drive each open proposal to proceed, named revision, dated defer, or close.
- Complete the first closed-won handoff within 24 hours of agreement and required payment.
- Run the source-to-revenue and win/loss review.
- Decide continue, change, or stop for the name-change segment.
- Preserve the winning buyer language and retire unsupported assumptions.

## Daily operating rhythm

1. Process new requests, booked meetings, missed calls, and opt-outs.
2. Clear ownerless or next-action-less records.
3. Complete one meaningful research or sales action before creating new content.
4. Log observed facts separately from inferences and buyer statements.
5. End the day with tomorrow's next actions assigned and dated.

## Weekly command review

Review every Friday:

| Question | Metric/evidence | Decision |
| --- | --- | --- |
| Are the right accounts entering research? | Rubric score and disqualifiers | Keep or change segment |
| Are material observations reproducible? | Completed versioned records | Keep or change research method |
| Can we reach buyers legitimately? | Accounts with permitted paths | Keep or change distribution |
| Do replies contain a consequence? | Positive replies and buyer language | Keep or change message |
| Do held sessions qualify? | Connected-to-qualified rate | Keep or change discovery/targeting |
| Do qualified buyers accept scope? | Proposal acceptance and loss reasons | Keep or change offer/proposal |
| Is follow-up operationally sound? | SLA, owner, next-action, opt-out failures | Fix operations before adding volume |

Select one constraint per review. Do not respond to a conversion problem by adding unqualified volume.

## Stop conditions

Pause the campaign immediately for any of the following:

- Contact without a documented basis or a suppression/opt-out failure
- An unsupported allegation presented as an observed AI-answer fact
- A quoted offer or price that conflicts with the approved model
- Unowned inbound records or repeat first-response SLA failures
- A broken booking, form, attribution, or CRM route
- Delivery capacity insufficient for an accepted scope

## Source records

- `docs/campaigns/NAME_CHANGE_REPRESENTATION_RESEARCH_QUEUE.md`
- `docs/campaigns/REPRESENTATION_BASELINE_SALES_PLAYBOOK.md`
- `docs/campaigns/FUNNEL_CRM_LAUNCH_READINESS_2026-08-19.md`
- `docs/GTM_SCORECARD_TEMPLATE.md`
- `docs/SALES_DISCOVERY_TEMPLATE.md`
- `docs/PROPOSAL_TEMPLATE.md`
- `docs/CLIENT_HANDOFF_TEMPLATE.md`
