# AURE Notion Dashboard, Alerts, and Mock-Submission Test

## Purpose

The dashboard should answer three questions without inventing a larger sales operation: **what AURE content is creating conversations, is anyone waiting for a response, and which conversations become scoped or applied work?** Keep the source-of-truth at the individual inquiry level in the **AURE Inquiry Ledger**, then use a small monthly snapshot database to display conversion rates honestly.

Notion charts update as their underlying database changes. Paid plans can create unlimited charts, while the Free Plan can create one chart. Dashboard views are currently available on Business and Enterprise plans; an inline page with linked views is the lighter alternative for Free or Plus workspaces.[1] [2]

## 1. Add three reporting properties to the AURE Inquiry Ledger

These properties do not replace the existing lead schema. They make reporting and monthly review consistent.

| Property | Type | Values or behavior | Owner |
|---|---|---|---|
| **Qualified at** | Date | Set when the inquiry reaches `Working session` or `Scoping` | Human |
| **Applied at** | Date | Set only when the inquiry becomes an `Applied Swell engagement` | Human |
| **Closed at** | Date | Set when Stage becomes `Won`, `Lost`, or `Not now` | Human |

The operational rule is simple: move **Stage** first, then fill the matching milestone date. Do not infer a conversion from a vague note or a proposal draft.

## 2. Create an AURE Monthly Metrics database

Create a second database named **AURE Monthly Metrics**. It is a monthly snapshot, not a duplicate lead ledger. On the first business day of each month, count the prior calendar month from the ledger’s filtered views and enter the figures below. This takes only a few minutes at AURE’s current lead volume and keeps conversion rates traceable to actual records.

| Property | Type | Use |
|---|---|---|
| **Month** | Title | `2026-08` or `August 2026` |
| **Month start** | Date | First day of the reporting month |
| **AURE inquiries** | Number | Count where `AURE origin = AURE` and Submitted at is in month |
| **Qualified conversations** | Number | Count where Qualified at is in month |
| **Scoped reviews** | Number | Count where Stage reached `Scoping` in month |
| **Applied engagements** | Number | Count where Applied at is in month |
| **Lead to qualified %** | Formula | `if(prop("AURE inquiries") == 0, 0, prop("Qualified conversations") / prop("AURE inquiries"))` formatted as Percent |
| **Lead to scoped %** | Formula | `if(prop("AURE inquiries") == 0, 0, prop("Scoped reviews") / prop("AURE inquiries"))` formatted as Percent |
| **Lead to applied %** | Formula | `if(prop("AURE inquiries") == 0, 0, prop("Applied engagements") / prop("AURE inquiries"))` formatted as Percent |
| **Review note** | Rich text | Explain material changes, such as a public audit release or an inactive period |

Avoid comparing a month with fewer than three AURE inquiries to a mature conversion benchmark. Treat it as directional evidence, not a statistically stable rate.

## 3. Build the dashboard

### Business or Enterprise workspace: a dashboard view

In **AURE Inquiry Ledger**, select `+ Add a view` → `Dashboard`, name it **AURE Demand Control Room**, then use these widgets. Notion dashboards support up to twelve widgets and four per row, but this workflow needs only six focused widgets.[2]

| Row | Widget | Source and configuration | Decision it supports |
|---|---|---|---|
| 1 | **Response queue** | Ledger table filtered to Stage `New` or `Response due`, sorted by Next action due ascending | Who needs a response now? |
| 1 | **Open applied work** | Ledger board grouped by Stage, filtered to `Working session`, `Scoping`, `Proposal` | Where is current work progressing? |
| 2 | **AURE inquiries over time** | Ledger line chart. X axis: Submitted at. Y axis: Count. Filter: AURE origin `AURE`. Group by: AURE campaign if volume makes the comparison useful. | Is AURE creating demand over time? |
| 2 | **AURE entry-point mix** | Ledger donut chart. Count by AURE placement. Filter: AURE origin `AURE`. | Which AURE page or CTA is creating conversations? |
| 3 | **Conversion trend** | Monthly Metrics line chart. X axis: Month start. Y axis: Lead to qualified %, Lead to scoped %, or Lead to applied %. Make one chart per rate rather than combining incompatible definitions. | Is the quality of AURE demand improving? |
| 3 | **Monthly review table** | Monthly Metrics table, sorted by Month start descending | What operational change explains the numbers? |

Use a global filter for **Month start** or **Submitted at** only when the selected widgets all expose the relevant property. Dashboard global filters apply only to widgets whose underlying views include the selected property.[2]

### Free or Plus workspace: an inline dashboard page

Create a regular page named **AURE Demand Control Room**. Put the response queue and open applied-work linked database views at the top, then add the one most important chart: **AURE inquiries over time**. The Free Plan has one chart available; Plus has unlimited charts.[1] This is a better first setup than a complicated automated metric system.

## 4. Notification configuration

### Default: assign the Owner in the server adapter

Notion notifies people when they are added to a People property in a database.[3] This is the lowest-noise new-lead signal because the alert is tied to a named owner, not a generic inbox.

Add one server-only environment variable:

| Variable | Value |
|---|---|
| `NOTION_AURE_LEADS_OWNER_ID` | The Notion user ID of the person who owns first response |

Then add this helper to `lib/notion-leads-adapter.js`:

```js
function ownerPeople(ownerId) {
  return ownerId ? [{ object: "user", id: ownerId }] : [];
}
```

Pass `ownerId = process.env.NOTION_AURE_LEADS_OWNER_ID` into `notionLeadProperties`, then include this property in the returned object:

```js
"Owner": { people: ownerPeople(ownerId) },
```

This produces one inbox, desktop, mobile, or email notification according to the owner’s Notion notification preferences. Turn on **Always send email notifications** only if a missed browser or mobile notification would be unacceptable.[3]

### Optional: one Slack alert for every AURE page added

If the team already works in Slack, create one database automation in the AURE Inquiry Ledger:

| Setting | Exact configuration |
|---|---|
| Name | `AURE lead added` |
| Trigger | `Page added` in a view filtered to AURE origin `AURE` |
| Action | `Send Slack notification to…` the dedicated lead channel |
| Message | `New AURE inquiry: @Lead · @AURE campaign · @AURE placement · next action: @Next action due` |

Notion supports `Page added` triggers and sending notifications to workspace people. It also supports Slack notifications from database automations, with current plan availability and connected-account requirements shown in Notion’s automation and Slack documentation.[4] [5]

Do **not** send a second alert merely because Stage changes from `New` to `Response due`, and do not configure one Slack message per overdue item. Use the response queue and owner reminder instead. Duplicate alerts make the dashboard less useful and train people to ignore the real ones.

### Automation hygiene

Database automations cannot trigger other database automations. They can also pause on errors, including broken connections, and need to be turned back on after the underlying issue is fixed.[4] Review the automation list monthly and after changing the ledger schema, Slack connection, or lead destination.

## 5. Safe mock-submission test

The added automated test exercises the real `POST /api/leads` handler while replacing the downstream network request with an in-memory capture. It uses an `example.invalid` address and a non-routable test endpoint, so it cannot create a prospect, contact a CRM, or send an email.

Run it locally from the Swell repository:

```bash
npm test
```

The test file is `tests/aure-lead-mock-submission.test.mjs`. It verifies all of the following for an OMNY audit handoff.

| Assertion | Expected value |
|---|---|
| HTTP result | `202 Accepted` |
| Normalized source | `aure` |
| Inquiry origin | `aure` |
| Campaign | `aure_public_record` |
| Placement | `omny_audit` |
| Referrer | `https://aure.swellmarketing.xyz/omny-audit` |
| Destination behavior | Captured in memory only |

To test the real Notion destination after its secrets are configured, do **one** manual non-production submission with a dedicated test mailbox. Confirm the ledger entry, then delete the test page. Do not test with a real prospect, and do not run a mock against production secrets.

## References

[1] [Notion Help, Chart view](https://www.notion.com/help/charts)

[2] [Notion Help, Dashboard views](https://www.notion.com/help/dashboards)

[3] [Notion Help, Notification settings](https://www.notion.com/help/notification-settings)

[4] [Notion Help, Database automations](https://www.notion.com/help/database-automations)

[5] [Notion Help, Integrate Slack](https://www.notion.com/help/slack)
