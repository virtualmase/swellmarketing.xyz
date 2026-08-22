# AURE Notion Lead Database and Swell Intake Adapter

## Implementation boundary

Keep the current AURE links and Swell contact form. The browser continues to submit only to `POST /api/leads`. The server validates consent, spam protection, form age, and AURE attribution before it writes a new page into a private Notion data source. **Never call the Notion API from browser JavaScript and never put a Notion token in a UTM link, hidden input, or public environment variable.**

The adapter below uses Notion API version `2026-03-11`, the latest version named in the current official page-creation reference.[1] A page created below a data source must use property names that match that data source’s schema, and the connection needs Insert Content capability on the target data source.[1]

## 1. Create one Notion database

Create a database named **AURE Inquiry Ledger**. It is a lead ledger, not a public form. Share the database with a new internal Notion connection named **Swell Lead Intake** and grant that connection **Insert Content** capability. Record the resulting **data source ID**, not just the database URL.

### Exact field model

Create the following properties with these names and types. The property names are an API contract, so preserve capitalization and punctuation.

| Property | Notion type | Values or configuration | Written by |
|---|---|---|---|
| **Lead** | Title | Required title field | Server: contact name, then email, then inquiry ID |
| **Inquiry ID** | Rich text | Immutable | Server: normalized `eventId` |
| **Stage** | Status | `New`, `Response due`, `Working session`, `Scoping`, `Proposal`, `Won`, `Lost`, `Not now` | Server creates `New`; human advances it |
| **Outcome** | Select | `Open`, `No fit`, `Method conversation`, `Scoped AURE review`, `Applied Swell engagement` | Human |
| **Priority** | Select | `Standard`, `Time-sensitive`, `Public-interest`, `Partner` | Human |
| **Owner** | People | Workspace members who may respond | Human |
| **Next action** | Rich text | Plain-language required next step | Server creates initial action; human updates it |
| **Next action due** | Date | Include time | Server sets ten minutes after receipt; human updates it |
| **Contact email** | Email | Email address | Server |
| **Role** | Rich text | Optional | Server |
| **Company website** | URL | Optional | Server |
| **Company** | Rich text | Optional, use the submitted domain or a human-edited name | Server fills hostname; human may refine it |
| **Inquiry** | Rich text | Full bounded question or observed problem | Server: `opportunity.trigger` |
| **Commercial impact** | Rich text | Optional | Server: `opportunity.commercialConsequence` |
| **Timeline** | Select | `within_30_days`, `within_90_days`, `this_year`, `exploring` | Server |
| **First constraint** | Select | `entity_definition`, `crawler_access`, `evidence`, `corroboration`, `measurement`, `unclear` | Server |
| **AURE origin** | Select | `AURE`, `General` | Server: normalized `inquiryOrigin` |
| **AURE campaign** | Select | `aure_method`, `aure_public_record`, `not_applicable`, `other` | Server from `utmCampaign` |
| **AURE placement** | Select | `primary_navigation`, `hero_cta`, `review_brief`, `closing_cta`, `omny_audit`, `direct_or_referrer`, `other` | Server from `utmContent` |
| **Normalized source** | Select | `aure`, `direct`, `organic_search`, `organic_ai`, `referral`, `partner`, `mason_research`, `linkedin`, `email`, `event`, `paid`, `outbound` | Server: `opportunity.source` |
| **UTM source** | Rich text | Raw value | Server |
| **UTM medium** | Rich text | Raw value | Server |
| **Referrer** | URL | Optional | Server |
| **Source page** | Rich text | Original Swell page or route where attribution started | Server |
| **Latest touch** | Rich text | Compact latest campaign, content, referrer, and page string | Server |
| **Response consent** | Checkbox | `true` or `false` | Server |
| **Marketing consent** | Checkbox | `true` or `false` | Server |
| **Submitted at** | Date | Include time | Server: `occurredAt` |
| **Received at** | Created time | Notion generated | Notion |
| **Last updated** | Last edited time | Notion generated | Notion |

Use select values exactly as shown. Pre-create the options in Notion rather than relying on the API to create options during an intake event.

### Required operating views

| View name | Filter | Sort | Use |
|---|---|---|---|
| **New and response due** | Stage is `New` or `Response due` | Next action due ascending | Daily response queue |
| **AURE method demand** | AURE origin is `AURE` | Submitted at descending | See method-created demand |
| **Public record response** | AURE campaign is `aure_public_record` | Submitted at descending | Measure OMNY and future public records |
| **Active opportunities** | Stage is `Working session`, `Scoping`, or `Proposal` | Next action due ascending | Run the applied-work pipeline |
| **Outcomes** | Stage is `Won`, `Lost`, or `Not now` | Submitted at descending | Monthly AURE learning review |

## 2. Configure server secrets

Set these only in the Swell deployment environment, never in client-side variables.

| Variable | Value |
|---|---|
| `NOTION_AURE_LEADS_TOKEN` | The private token for the **Swell Lead Intake** Notion connection |
| `NOTION_AURE_LEADS_DATA_SOURCE_ID` | The AURE Inquiry Ledger data source ID |

The existing `TURNSTILE_*` variables remain unchanged. The existing `GTM_WEBHOOK_*` and `HUBSPOT_*` variables are no longer needed only after the Notion adapter has been production-tested and the HubSpot path has been deliberately retired.

## 3. Add the Notion adapter

Create `lib/notion-leads-adapter.js` with the following content.

```js
const NOTION_VERSION = "2026-03-11";
const NOTION_ENDPOINT = "https://api.notion.com/v1/pages";

export class NotionLeadError extends Error {
  constructor(message, status, retryable) {
    super(message);
    this.name = "NotionLeadError";
    this.status = status;
    this.retryable = retryable;
  }
}

function clip(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function richText(value) {
  const content = clip(value);
  return content ? [{ type: "text", text: { content } }] : [];
}

function title(value) {
  return { title: richText(value) };
}

function select(value) {
  return { select: value ? { name: value } : null };
}

function status(value) {
  return { status: { name: value } };
}

function rich(value) {
  return { rich_text: richText(value) };
}

function validUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function hostname(value) {
  try {
    return new URL(String(value || "")).hostname || "";
  } catch {
    return "";
  }
}

function latestTouchText(latest = {}) {
  return [
    latest.utmCampaign && `campaign=${latest.utmCampaign}`,
    latest.utmContent && `content=${latest.utmContent}`,
    latest.referrer && `referrer=${latest.referrer}`,
    latest.sourcePage && `page=${latest.sourcePage}`
  ].filter(Boolean).join(" | ");
}

function placement(content, origin) {
  const allowed = new Set([
    "primary_navigation",
    "hero_cta",
    "review_brief",
    "closing_cta",
    "omny_audit"
  ]);
  if (allowed.has(content)) return content;
  return origin === "aure" ? "direct_or_referrer" : "other";
}

function campaign(value) {
  return ["aure_method", "aure_public_record"].includes(value) ? value : value ? "other" : "not_applicable";
}

function initialLeadTitle(event) {
  const contact = event.contact || {};
  return contact.name || contact.email || event.eventId;
}

export function notionLeadProperties(event) {
  const contact = event.contact || {};
  const opportunity = event.opportunity || {};
  const attribution = event.attribution || {};
  const latest = attribution.latestTouch || {};
  const receivedAt = event.occurredAt;
  const actionAt = opportunity.nextActionAt || receivedAt;
  const origin = opportunity.inquiryOrigin === "aure" ? "AURE" : "General";

  return {
    "Lead": title(initialLeadTitle(event)),
    "Inquiry ID": rich(event.eventId),
    "Stage": status("New"),
    "Outcome": select("Open"),
    "Next action": rich(opportunity.nextAction || "Review request and respond"),
    "Next action due": { date: { start: actionAt } },
    "Contact email": { email: contact.email || null },
    "Role": rich(contact.role),
    "Company website": { url: validUrl(event.company?.website) },
    "Company": rich(hostname(event.company?.website)),
    "Inquiry": rich(opportunity.trigger),
    "Commercial impact": rich(opportunity.commercialConsequence),
    "Timeline": select(opportunity.timeline || "exploring"),
    "First constraint": select(opportunity.firstConstraint || "unclear"),
    "AURE origin": select(origin),
    "AURE campaign": select(campaign(attribution.utmCampaign)),
    "AURE placement": select(placement(attribution.utmContent, opportunity.inquiryOrigin)),
    "Normalized source": select(opportunity.source || "direct"),
    "UTM source": rich(attribution.utmSource),
    "UTM medium": rich(attribution.utmMedium),
    "Referrer": { url: validUrl(attribution.referrer) },
    "Source page": rich(attribution.sourcePage),
    "Latest touch": rich(latestTouchText(latest)),
    "Response consent": { checkbox: contact.consent?.response === true },
    "Marketing consent": { checkbox: contact.consent?.marketing === true },
    "Submitted at": { date: { start: receivedAt } }
  };
}

export async function processNotionLead(event, {
  token = process.env.NOTION_AURE_LEADS_TOKEN,
  dataSourceId = process.env.NOTION_AURE_LEADS_DATA_SOURCE_ID,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!token || !dataSourceId) {
    throw new NotionLeadError("Notion lead destination is not configured.", 503, false);
  }

  const response = await fetchImpl(NOTION_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: notionLeadProperties(event)
    }),
    signal: AbortSignal.timeout(8_000)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new NotionLeadError(
      body.message || "Notion did not accept the lead.",
      response.status,
      response.status >= 500 || response.status === 429
    );
  }

  return { status: "processed", eventId: event.eventId, pageId: body.id };
}
```

## 4. Replace only the CRM destination in the current Swell intake endpoint

The existing `api/leads.js` is already responsible for browser-origin checks, form validation, Turnstile validation, AURE classification, and normalized event creation. Preserve all of that code. Replace only the final outbound CRM dispatch.

In `api/leads.js`, remove the `GTM_WEBHOOK_URL` validation and `fetch(destination, ...)` block after the `event` object. Add this import at the top:

```js
import { NotionLeadError, processNotionLead } from "../lib/notion-leads-adapter.js";
```

Then replace the current outbound-dispatch block with:

```js
  try {
    const result = await processNotionLead(event);
    return json(response, 202, { ok: true, code: "accepted", ...result });
  } catch (error) {
    const retryable = error instanceof NotionLeadError ? error.retryable : false;
    console.error(JSON.stringify({
      code: "notion_lead_failed",
      eventId,
      status: error.status,
      retryable,
      message: error.message
    }));
    return json(response, retryable ? 503 : 422, {
      ok: false,
      code: "notion_lead_failed",
      retryable
    });
  }
```

No change is required to the browser form submission handler. Its payload already includes the AURE link UTM values, session attribution, consent flags, and form-timing values. The server currently classifies an inquiry as AURE-originated when `utm_source=aure`, the latest source is `aure`, or the referrer hostname is `aure.swellmarketing.xyz`.

## 5. Preserve the AURE link convention

The public AURE pages should keep these query values on every Swell contact handoff:

```text
utm_source=aure
utm_medium=referral
utm_campaign=aure_method | aure_public_record
utm_content=primary_navigation | hero_cta | review_brief | closing_cta | omny_audit
```

Examples already implemented:

```text
https://swellmarketing.xyz/contact/?utm_source=aure&utm_medium=referral&utm_campaign=aure_method&utm_content=hero_cta
https://swellmarketing.xyz/contact/?utm_source=aure&utm_medium=referral&utm_campaign=aure_public_record&utm_content=omny_audit
```

## 6. Non-production acceptance test

Use a dedicated test email, not a real prospect. Open an AURE-tagged contact URL, complete the form, and check the new Notion page.

| Expected field | Expected value for the OMNY link |
|---|---|
| AURE origin | `AURE` |
| AURE campaign | `aure_public_record` |
| AURE placement | `omny_audit` |
| Normalized source | `aure` |
| Stage | `New` |
| Outcome | `Open` |
| Response consent | `true` |
| Next action | `Review request and respond` |

Confirm a duplicate submission is not created before retiring the HubSpot path. The current endpoint’s event ID is time-bucketed, so the production version should add a Notion-side inquiry-ID lookup or a small durable idempotency store before relying on repeated-submission protection across long periods.

## References

[1] [Notion Developers, Create a page](https://developers.notion.com/reference/post-page)

[2] [Notion Developers, Data source properties](https://developers.notion.com/reference/property-object)
