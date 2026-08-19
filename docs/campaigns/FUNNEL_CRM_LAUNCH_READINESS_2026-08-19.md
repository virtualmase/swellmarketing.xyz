# Funnel, CRM, Attribution, and Measurement Launch Readiness

**Reviewed:** 2026-08-19
**Scope:** `swellmarketing.xyz` public lead capture, HubSpot adapter, booking route, attribution, aggregate GTM reporting, and local validation
**Decision:** **Conditionally ready for controlled founder-led traffic; not ready for unattended or scaled campaign traffic.**

## Deployment update

On 2026-08-19, deployment `dpl_2j5UtHbSsgeEjBAriLZyC8hmvQof` reached Ready and received the production aliases including `swellmarketing.xyz`. Production verification confirmed the corrected `ops@swellmarketing.xyz` request-form fallback and submit label. The production health endpoint still returns HTTP 503 because `turnstile` remains false; HubSpot and the GTM webhook remain reported true. The custom-pipeline revenue-reporting fix is included in this deployment but still requires comparison with authenticated live CRM records before its production totals can be certified.

Deployment `dpl_J42JBPr6bVj5qr2Yi6TVFScQFQhK` subsequently added privacy-minimal funnel events through Vercel Analytics. Production source verification confirmed `swell_cta_click`, `diagnostic_completed`, and `lead_request_saved` are live. Event names are allowlisted; dimensions are sanitized and limited to destination, page, campaign/content, or diagnostic constraint. Names, emails, URLs entered by prospects, and free-text form answers are not emitted. Automated tests cover allowlisting, CTA classification, and dimension sanitization.

## Executive result

The owned request-form path is implemented and the production health endpoint confirms that HubSpot and the internal GTM webhook are configured. The canonical HubSpot Meetings page returned HTTP 200. Local automated checks pass across API success/failure behavior, CRM mapping, duplicate protection, links, conversion contracts, and signal quality.

Two launch gates remain open:

1. Production Turnstile is not configured. The form still accepts leads by design, but the production health endpoint is degraded and the campaign has only the honeypot/form-age controls against automated submissions.
2. A real production submission has not been verified during this review. Without that controlled transaction, contact creation, ownership, task creation, notification/queue visibility, and first-response operations remain configuration claims rather than end-to-end evidence.

Controlled low-volume founder outreach may send prospects to HubSpot Meetings or the request form if Mason actively watches both destinations. Do not start scaled distribution until the two gates above are closed.

## Readiness by path

| Area | Status | Evidence | Required action |
|---|---|---|---|
| Public request form | Conditional | Browser form captures required problem, website, consent, timing, first/latest attribution, anti-spam fields, and sends JSON to `/api/leads`. API validates origin, content type, size, field values, consent, form age, and webhook destination. | Complete one production synthetic submission and record the resulting contact, company, note, task, owner, and response timestamp. |
| HubSpot event adapter | Locally ready | Local GTM check verifies contact/company/note/task creation, company reuse, exact-event deduplication, qualified-deal creation, offer amount, associations, and opt-out persistence. Production health reports `hubspot: true`. | Validate the live private-app scopes and all resulting objects with the controlled production submission. |
| Internal GTM webhook | Configured | Production health reports `gtmWebhook: true`; endpoint requires a bearer secret and rejects invalid events. | Verify failures are visible to an assigned person and document the replay procedure with one named owner. |
| HubSpot Meetings | Reachable | Canonical scheduling URL returned HTTP 200 with campaign UTM parameters preserved in the requested URL. | Book and cancel one internal test meeting; verify contact ownership, source visibility, cancellation handling, and follow-up queue behavior. |
| First/latest-touch attribution | Ready for request-form conversions | `assets/attribution.js` preserves first touch, latest meaningful touch, and current page in session storage; the contact form forwards both touch sets. Local journey and API assertions pass. | Treat session attribution as directional: it does not survive devices/browsers and currently has no intermediate-touch activity stream. |
| Campaign/booking attribution | Partial | Every booking CTA uses the canonical HubSpot URL and a structured campaign/content value. | Reconcile HubSpot meeting-created contacts with Swell campaign records. Meeting-only contacts do not receive `swell_last_event_ids` or the normalized `swell_source` fields through the current adapter, so the aggregate Swell contact report can omit them. |
| Funnel-event measurement | Implemented; production provisioning/test required | Governed Vercel events cover diagnostic completion, high-intent CTA clicks, and confirmed lead saves. The authenticated GTM event contract now records booked/held/no-show meetings and sent/accepted proposals as timestamped HubSpot contact milestones, and the aggregate report exposes privacy-safe unique-contact counts. | Provision the five new properties, connect an owner-controlled workflow, and run the verification packet in `FUNNEL_EVENT_OPERATIONS.md`. Visitor-to-booking remains directional until the first live reconciliation. |
| Revenue reporting | Fixed locally; deploy required | `lib/gtm-report.js` now uses HubSpot's `hs_is_closed` and `hs_is_closed_won` flags. This works with opaque custom-pipeline stage IDs. A regression test covers won, lost, and open deals. | Deploy this change before trusting open pipeline or closed-won totals from the aggregate report. |
| Intake protection | Blocked for scale | Production `/api/health/` returned HTTP 503/degraded with `turnstile: false`; `/api/public-config/` returned an empty site key. | Configure both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, then verify the widget and a successful challenged submission. |
| Operating ownership/SLA | Unverified | The adapter can create a high-priority owned response task due 10 minutes after intake when `HUBSPOT_OWNER_ID` is configured. Production health does not expose owner configuration, and no live CRM read was authorized by local credentials. | Confirm the owner ID, saved new-lead view, notification path, backup owner, and daily queue. Record a measured first response from the controlled test. |

## Local fixes made

1. Corrected aggregate deal-state measurement for custom HubSpot pipelines. The previous report recognized only literal `closedwon` and `closedlost` stage names; custom pipelines normally use opaque IDs. It could therefore count closed deals as open and report no won revenue.
2. Added a regression test proving that an opaque won-stage ID contributes to closed-won revenue, an opaque lost-stage ID is not open, and only the genuinely open deal contributes to open pipeline.
3. Aligned the request-form failure fallback with the public operating address (`ops@swellmarketing.xyz`) and restored the original submit label after each attempt.

## Exact production closeout sequence

1. Configure both Turnstile variables in Vercel and redeploy.
2. Confirm `/api/health/` returns HTTP 200 with all three dependencies true and `/api/public-config/` returns the expected public site key.
3. From a tagged campaign URL, submit a designated internal test lead after completing Turnstile.
4. In HubSpot, verify exactly one contact, one associated company, one note containing the event ID, one owned high-priority task, original/latest source fields, response consent, and marketing-consent state.
5. Replay the normalized event from a controlled source and confirm no duplicate note, task, company, or deal.
6. Book and cancel one tagged internal HubSpot meeting. Verify source visibility, ownership, cancellation history, and follow-up handling.
7. Complete one qualified test event and confirm exactly one associated deal in the configured Qualified stage with the expected offer amount.
8. Run the aggregate report and compare its open amount and closed-won values against the CRM records.
9. Archive the synthetic fixtures according to the documented cleanup procedure, preserving only the validation evidence needed for auditability.

## Checks run

- `npm run check` — passed.
  - Node tests: 3 files passed, including the new custom-pipeline reporting regression.
  - GTM system: passed; 5 offers, 11 stages, 7 qualification dimensions, 35 HubSpot properties, endpoint failure/success paths, CRM mapping, duplicate suppression, and opt-out behavior verified.
  - Link check: passed across 31 HTML files.
  - Signal-quality check: passed across 31 HTML files.
- Production `GET /api/health/` — HTTP 503, degraded: HubSpot true, GTM webhook true, Turnstile false.
- Production `GET /api/public-config/` — HTTP 200, empty Turnstile site key.
- Canonical HubSpot Meetings URL — HTTP 200.

The local shell had no HubSpot or deployment secrets, so no live CRM read or mutating synthetic transaction was performed. That is why production end-to-end verification remains an explicit launch gate rather than an inferred pass.
