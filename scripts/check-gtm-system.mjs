#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];
const read = (relative) => readFile(path.join(root, relative), "utf8");
const exists = async (relative) => {
  try {
    await access(path.join(root, relative));
    return true;
  } catch {
    return false;
  }
};

const model = JSON.parse(await read("data/gtm-operating-model.json"));
const schema = JSON.parse(await read("data/schemas/lead-submission.schema.json"));
const pricing = await read("pricing/index.html");
const contact = await read("contact/index.html");
const privacy = await read("privacy/index.html");
const vapi = JSON.parse(await read("vapi/swell-pipeline-concierge.json"));
const hubspotManifest = JSON.parse(await read("data/hubspot-manifest.json"));
const masonAgent = JSON.parse(await read("data/mason-agent.json"));
const missionLedger = JSON.parse(await read("data/mission-activity-ledger.json"));
const experimentRegistry = JSON.parse(await read("data/mission-experiments.json"));
const privateRepresentationFixtures = [
  "data/representation-gap-target-accounts.json",
  "data/representation-gap-baseline-run.json"
];
const hasPrivateRepresentationFixtures = (await Promise.all(privateRepresentationFixtures.map(exists))).every(Boolean);
if (!hasPrivateRepresentationFixtures && process.env.STRICT_PRIVATE_FIXTURES === "1") {
  issues.push("private representation fixtures are required when STRICT_PRIVATE_FIXTURES=1");
}
const targetAccounts = hasPrivateRepresentationFixtures
  ? JSON.parse(await read("data/representation-gap-target-accounts.json"))
  : null;
const baselineRun = hasPrivateRepresentationFixtures
  ? JSON.parse(await read("data/representation-gap-baseline-run.json"))
  : null;
const envExample = await read(".env.example");
const { validateExperiments, validateMissionLedger } = await import(path.join(root, "lib/mission-evidence.js"));
const attributionPages = ["index.html", "services/index.html", "method/index.html", "pricing/index.html", "about/index.html", "resources/index.html", "resources/ai-still-describes-retired-product/index.html", "geo-audit/index.html", "academy/index.html", "roadmap.html", "contact/index.html"];
const attributionScript = await read("assets/attribution.js");

const weights = model.qualification.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
if (weights !== 100) issues.push(`qualification weights total ${weights}, expected 100`);

const stageOrders = model.lifecycleStages.map((stage) => stage.order);
if (new Set(stageOrders).size !== stageOrders.length) issues.push("lifecycle stage order values are not unique");
if (stageOrders.some((order, index) => index && order <= stageOrders[index - 1])) issues.push("lifecycle stages are not ordered monotonically");

const offerIds = new Set(model.offers.map((offer) => offer.id));
if (offerIds.size !== model.offers.length) issues.push("offer IDs are not unique");
for (const [price, label] of [[1500, "GEO Starter"], [2500, "GEO Growth"], [3500, "GEO Scale"]]) {
  if (!pricing.includes(`$${price.toLocaleString()} / month`)) issues.push(`pricing page is missing $${price.toLocaleString()} for ${label}`);
  if (!vapi.model.messages[0].content.includes(`$${price.toLocaleString()}`)) issues.push(`Vapi prompt is missing $${price.toLocaleString()}`);
}
if (!pricing.includes("$2,500 · Swell diagnostic") && !pricing.includes("$2,500")) issues.push("public pricing does not expose the commissioned baseline price");
if (!vapi.model.messages[0].content.includes("from $2,500")) issues.push("Vapi prompt does not expose the commissioned baseline price");

for (const field of schema.required) {
  if (!new RegExp(`name=["']${field}["']`).test(contact)) issues.push(`contact form is missing required field ${field}`);
}
for (const field of ["utmSource", "utmMedium", "utmCampaign", "utmContent", "referrer", "firstConstraint"]) {
  if (!new RegExp(`name=["']${field}["']`).test(contact)) issues.push(`contact form is missing attribution field ${field}`);
}
for (const field of ["latestSourcePage", "latestReferrer", "latestUtmSource", "latestUtmMedium", "latestUtmCampaign", "latestUtmContent"]) {
  if (!new RegExp(`name=["']${field}["']`).test(contact)) issues.push(`contact form is missing journey field ${field}`);
}
if (!contact.includes('href="/privacy/"')) issues.push("contact form does not link to the privacy notice");
for (const heading of ["What Swell collects", "Why it is used", "Voice and meeting information", "Retention and choices", "Contact"]) {
  if (!privacy.includes(heading)) issues.push(`privacy notice is missing ${heading}`);
}
for (const variable of ["GTM_WEBHOOK_URL", "GTM_WEBHOOK_SECRET", "VAPI_WEBHOOK_SECRET", "HUBSPOT_ACCESS_TOKEN", "HUBSPOT_PIPELINE_ID", "HUBSPOT_STAGE_QUALIFIED", "HUBSPOT_OWNER_ID", "OPENAI_API_KEY", "OPENAI_MODEL", "MASON_REPORT_SECRET", "PERPLEXITY_API_KEY", "PERPLEXITY_API_KEY_FILE"]) {
  if (!envExample.includes(`${variable}=`)) issues.push(`.env.example is missing ${variable}`);
}
if (masonAgent.authority?.executionMode !== "autonomous") issues.push("Mason agent is not configured for autonomous execution");
if (!masonAgent.identity?.isAI || !masonAgent.identity?.disclosure?.includes("not the human")) issues.push("Mason agent disclosure is incomplete");
if (!masonAgent.missionCompletion?.caseStudyPath) issues.push("Mason agent case-study destination is missing");
if (Date.parse(masonAgent.objective?.endsAt) <= Date.parse(masonAgent.objective?.startsAt)) issues.push("Mason agent objective dates are invalid");
for (const [key, target] of Object.entries(masonAgent.objective?.targets || {})) {
  if (!Number.isFinite(target) || target < 0) issues.push(`Mason agent target ${key} is invalid`);
}
issues.push(...validateMissionLedger(missionLedger));
issues.push(...validateExperiments(experimentRegistry));
if (hasPrivateRepresentationFixtures) {
  if (targetAccounts.accounts?.length !== 10) issues.push("Representation Gap experiment must contain exactly 10 researched accounts");
  if (new Set(targetAccounts.accounts?.map((account) => account.priority)).size !== 10) issues.push("Representation Gap account priorities are not unique");
  for (const account of targetAccounts.accounts || []) {
    if (account.permissionStatus !== "not_established") issues.push(`${account.company} improperly infers contact permission`);
    if (account.representationStatus !== "unobserved") issues.push(`${account.company} claims an observation without a versioned baseline`);
    if (!account.evidenceUrl?.startsWith("https://")) issues.push(`${account.company} lacks a public HTTPS evidence source`);
    if (account.representationQuestions?.length !== 3) issues.push(`${account.company} must have exactly three versioned baseline queries`);
  }
  if (baselineRun.accounts?.length !== 10) issues.push("Representation Gap baseline must include all 10 researched accounts");
  if (baselineRun.accounts?.flatMap((account) => account.queries || []).length !== 30) issues.push("Representation Gap baseline must contain exactly 30 queries");
  if (baselineRun.accounts?.some((account) => account.representationStatus !== "unobserved" || account.queries?.some((query) => query.observations?.length))) {
    issues.push("Prepared Representation Gap baseline contains unverified observations");
  }
} else {
  console.warn("Private Representation Gap fixtures are absent; public GTM and API checks continue. Set STRICT_PRIVATE_FIXTURES=1 in the private validation environment to require them.");
}
for (const [objectType, properties] of [["contact", hubspotManifest.contactProperties], ["deal", hubspotManifest.dealProperties]]) {
  const names = properties.map((property) => property.name);
  if (new Set(names).size !== names.length) issues.push(`HubSpot ${objectType} property names are not unique`);
  for (const property of properties) {
    if (!property.name.startsWith("swell_")) issues.push(`HubSpot ${objectType} property ${property.name} is outside the Swell namespace`);
    if (property.type === "enumeration" && !property.options?.length) issues.push(`HubSpot enumeration ${property.name} has no options`);
  }
}
if (!hubspotManifest.dealProperties.some((property) => property.name === "swell_event_id" && property.hasUniqueValue === true)) issues.push("HubSpot deal event ID is not unique");
if (new Set(hubspotManifest.pipeline.stages.map((stage) => stage.key)).size !== hubspotManifest.pipeline.stages.length) issues.push("HubSpot recommended pipeline stage keys are not unique");
for (const page of attributionPages) {
  const markup = await read(page);
  if (!markup.includes('/assets/attribution.js')) issues.push(`${page} does not capture session attribution`);
}

const attributionStorage = new Map();
function simulateAttributionVisit(url, referrer) {
  const location = new URL(url);
  const sessionStorage = {
    getItem(key) { return attributionStorage.get(key) || null; },
    setItem(key, value) { attributionStorage.set(key, value); },
    removeItem(key) { attributionStorage.delete(key); }
  };
  vm.runInNewContext(attributionScript, { URL, URLSearchParams, Date, location, document: { referrer }, sessionStorage });
}
simulateAttributionVisit("https://swellmarketing.xyz/resources/ai-still-describes-retired-product/?utm_source=linkedin&utm_medium=organic_social&utm_campaign=representation_gap_q3_2026&utm_content=retired_product_description", "https://www.linkedin.com/");
simulateAttributionVisit("https://swellmarketing.xyz/geo-audit/?utm_source=swell_site&utm_medium=internal&utm_campaign=representation_gap_q3_2026&utm_content=retired_product_hero_cta", "https://swellmarketing.xyz/resources/ai-still-describes-retired-product/");
simulateAttributionVisit("https://swellmarketing.xyz/contact/", "https://swellmarketing.xyz/geo-audit/");
const journey = JSON.parse(attributionStorage.get("swell_attribution_v1") || "null");
if (journey?.firstTouch?.utmSource !== "linkedin" || journey?.firstTouch?.utmContent !== "retired_product_description") issues.push("attribution journey did not preserve original social touch");
if (journey?.latestTouch?.utmSource !== "swell_site" || journey?.latestTouch?.utmContent !== "retired_product_hero_cta") issues.push("attribution journey did not preserve the latest meaningful campaign CTA");
if (journey?.currentPage?.landingPage !== "/contact/") issues.push("attribution journey did not record the current contact page separately");

const { default: leadHandler } = await import(path.join(root, "api/leads.js"));
const { default: vapiHandler } = await import(path.join(root, "api/vapi-webhook.js"));
const { default: gtmEventsHandler } = await import(path.join(root, "api/gtm-events.js"));
const { createMasonReportHandler } = await import(path.join(root, "api/mason-report.js"));
const { processHubSpotEvent } = await import(path.join(root, "lib/hubspot-adapter.js"));

function responseHarness() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body = "") { this.body = body; }
  };
}

async function invokeMasonReport({ method = "POST", body = "", configuredSecret, getSnapshot } = {}) {
  const originalSecret = process.env.MASON_REPORT_SECRET;
  if (configuredSecret === undefined) delete process.env.MASON_REPORT_SECRET;
  else process.env.MASON_REPORT_SECRET = configuredSecret;
  const response = responseHarness();
  try {
    await createMasonReportHandler({ getSnapshot })({ method, headers: { "content-length": String(Buffer.byteLength(body)) }, body }, response);
  } finally {
    if (originalSecret === undefined) delete process.env.MASON_REPORT_SECRET;
    else process.env.MASON_REPORT_SECRET = originalSecret;
  }
  return { status: response.statusCode, headers: response.headers, body: JSON.parse(response.body) };
}

let reportResult = await invokeMasonReport({ method: "GET", configuredSecret: "test-report-secret" });
if (reportResult.status !== 405 || reportResult.body.code !== "method_not_allowed") issues.push("Mason report API did not reject non-POST methods");

reportResult = await invokeMasonReport({ body: "test-report-secret" });
if (reportResult.status !== 503 || reportResult.body.code !== "report_unconfigured") issues.push("Mason report API did not fail closed without a configured secret");

reportResult = await invokeMasonReport({ body: "wrong-secret", configuredSecret: "test-report-secret" });
if (reportResult.status !== 401 || reportResult.body.code !== "unauthorized") issues.push("Mason report API accepted an invalid secret");

const aggregateFixture = {
  generatedAt: "2026-08-09T21:00:00.000Z",
  contacts: { accountTotal: 1, swellTotal: 1, connected: 0, bySource: { direct: 1 }, byFit: { unknown: 1 }, doNotContact: 0, ownerless: 0 },
  pipeline: { accountTotalDeals: 0, swellTotalDeals: 0, byStage: {}, openAmount: 0, closedWonCount: 0, closedWonRevenue: 0, openWithoutNextAction: 0, overdueNextActions: 0, ownerlessOpenDeals: 0 },
  tasks: { accountTotal: 0, swellTotal: 0, byStatus: {}, open: 0, overdue: 0, ownerlessOpen: 0 }
};
reportResult = await invokeMasonReport({ body: "test-report-secret\n", configuredSecret: "test-report-secret", getSnapshot: async () => aggregateFixture });
if (reportResult.status !== 200 || reportResult.body.scope !== "aggregate_only") issues.push("Mason report API did not return the aggregate fixture");
if (JSON.stringify(reportResult.body).includes("email") || JSON.stringify(reportResult.body).includes("firstname")) issues.push("Mason report API fixture crossed the aggregate-only boundary");
if (reportResult.headers["cache-control"] !== "no-store, private") issues.push("Mason report API is missing private no-store caching");

reportResult = await invokeMasonReport({ body: "test-report-secret", configuredSecret: "test-report-secret", getSnapshot: async () => { throw new Error("sensitive upstream detail"); } });
if (reportResult.status !== 503 || reportResult.body.code !== "report_temporarily_unavailable" || JSON.stringify(reportResult.body).includes("sensitive")) {
  issues.push("Mason report API did not sanitize an upstream failure");
}

async function invoke(body, { method = "POST", fetchImpl, webhookUrl } = {}) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.GTM_WEBHOOK_URL;
  const originalSecret = process.env.GTM_WEBHOOK_SECRET;
  if (fetchImpl) globalThis.fetch = fetchImpl;
  if (webhookUrl === undefined) delete process.env.GTM_WEBHOOK_URL;
  else process.env.GTM_WEBHOOK_URL = webhookUrl;
  process.env.GTM_WEBHOOK_SECRET = "test-secret";
  const response = responseHarness();
  try {
    await leadHandler({ method, headers: { "content-length": String(JSON.stringify(body).length) }, body }, response);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.GTM_WEBHOOK_URL;
    else process.env.GTM_WEBHOOK_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.GTM_WEBHOOK_SECRET;
    else process.env.GTM_WEBHOOK_SECRET = originalSecret;
  }
  return { status: response.statusCode, body: JSON.parse(response.body) };
}

const validLead = {
  name: "Jamie Rivera",
  email: "JAMIE@NORTHSTAR.EXAMPLE",
  website: "northstar.example",
  role: "Founder",
  trigger: "AI answers describe an obsolete version of our enterprise product.",
  commercialConsequence: "Prospects repeat the obsolete limitation during sales calls.",
  timeline: "within_90_days",
  responseConsent: true,
  marketingConsent: false,
  sourcePage: "/contact/?utm_source=linkedin",
  firstConstraint: "evidence",
  utmSource: "linkedin",
  utmCampaign: "representation_gap_q3_2026",
  latestSourcePage: "/geo-audit/?utm_campaign=representation_gap_q3_2026",
  latestUtmSource: "swell_site",
  latestUtmMedium: "internal",
  latestUtmCampaign: "representation_gap_q3_2026",
  latestUtmContent: "retired_product_hero_cta"
};

let result = await invoke({ ...validLead, trigger: "short" });
if (result.status !== 400 || result.body.code !== "validation_failed") issues.push("lead API did not reject an invalid trigger");

result = await invoke({ ...validLead, responseConsent: false });
if (result.status !== 400 || !result.body.fieldErrors?.responseConsent) issues.push("lead API did not enforce response consent");

result = await invoke({ ...validLead, company: "spam" });
if (result.status !== 202 || result.body.eventId) issues.push("lead API honeypot did not quietly accept without forwarding");

result = await invoke(validLead);
if (result.status !== 503 || result.body.code !== "temporarily_unavailable") issues.push("lead API did not fail closed when the destination was absent");

let forwardedEvent;
result = await invoke(validLead, {
  webhookUrl: "https://crm.example/webhook",
  fetchImpl: async (_url, options) => {
    forwardedEvent = JSON.parse(options.body);
    return { ok: true, status: 202 };
  }
});
if (result.status !== 202 || !result.body.eventId) issues.push("lead API did not accept a valid forwarded lead");
if (forwardedEvent?.contact?.email !== "jamie@northstar.example") issues.push("lead API did not normalize email");
if (forwardedEvent?.opportunity?.firstConstraint !== "evidence") issues.push("lead API did not preserve the first constraint");
if (forwardedEvent?.opportunity?.source !== "linkedin") issues.push("lead API did not normalize the attributed source");
if (forwardedEvent?.attribution?.latestTouch?.utmContent !== "retired_product_hero_cta") issues.push("lead API did not preserve latest-touch campaign content");
if (forwardedEvent?.contact?.consent?.marketing !== false) issues.push("lead API changed optional marketing consent");
if (!forwardedEvent?.eventId || forwardedEvent.eventId !== result.body.eventId) issues.push("lead API event ID mismatch");

result = await invoke(validLead, {
  webhookUrl: "https://crm.example/webhook",
  fetchImpl: async () => ({ ok: false, status: 500 })
});
if (result.status !== 502) issues.push("lead API did not surface destination rejection");

async function invokeVapi(body, { secret = "test-vapi-secret", fetchImpl, webhookUrl = "https://crm.example/webhook" } = {}) {
  const originalFetch = globalThis.fetch;
  const environment = {
    GTM_WEBHOOK_URL: process.env.GTM_WEBHOOK_URL,
    GTM_WEBHOOK_SECRET: process.env.GTM_WEBHOOK_SECRET,
    VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET
  };
  if (fetchImpl) globalThis.fetch = fetchImpl;
  process.env.GTM_WEBHOOK_URL = webhookUrl;
  process.env.GTM_WEBHOOK_SECRET = "test-destination-secret";
  process.env.VAPI_WEBHOOK_SECRET = "test-vapi-secret";
  const response = responseHarness();
  try {
    await vapiHandler({ method: "POST", headers: { authorization: `Bearer ${secret}` }, body }, response);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  return { status: response.statusCode, body: JSON.parse(response.body) };
}

const vapiReport = {
  message: {
    type: "end-of-call-report",
    call: {
      id: "call_test_123",
      assistantId: "5b29bf0d-4e97-4b09-8e4f-1d16ea725591",
      type: "inboundPhoneCall",
      status: "ended",
      customer: { number: "+15555550123" }
    },
    artifact: {
      transcript: "Caller requested no further contact.",
      structuredOutputs: [{
        name: "swell_pipeline_outcome",
        result: {
          contactName: "Jamie Rivera",
          companyName: "Northstar",
          trigger: "Outdated product description",
          commercialConsequence: "Sales objections",
          firstConstraint: "evidence",
          fit: "disqualified",
          recommendedOffer: "none",
          nextAction: null,
          followUpConsent: false,
          doNotContact: true,
          unsupportedActionClaimed: false
        }
      }]
    }
  }
};

result = await invokeVapi(vapiReport, { secret: "wrong-secret" });
if (result.status !== 401) issues.push("Vapi webhook did not reject an invalid bearer secret");

let forwardedVapiEvent;
result = await invokeVapi(vapiReport, {
  fetchImpl: async (_url, options) => {
    forwardedVapiEvent = JSON.parse(options.body);
    return { ok: true, status: 202 };
  }
});
if (result.status !== 202 || result.body.eventId !== "vapi_call_test_123") issues.push("Vapi webhook did not accept a valid end-of-call report");
if (forwardedVapiEvent?.guardrails?.requiresImmediateOptOutProcessing !== true) issues.push("Vapi webhook did not elevate an opt-out");
if (forwardedVapiEvent?.opportunity?.firstConstraint !== "evidence") issues.push("Vapi webhook did not preserve structured qualification output");

result = await invokeVapi({ message: { type: "status-update" } });
if (result.status !== 200 || result.body.code !== "ignored_event") issues.push("Vapi webhook did not ignore a non-terminal event");

function hubSpotMock() {
  const state = { contacts: new Map(), companies: new Map(), deals: new Map(), notes: new Map(), tasks: new Map(), associations: [] };
  let sequence = 100;
  const response = (status, body) => new Response(body === null ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const parseBody = (options) => options.body ? JSON.parse(options.body) : {};
  const record = (id, properties) => ({ id: String(id), properties: { ...properties } });

  return {
    state,
    fetch: async (input, options = {}) => {
      const url = new URL(input);
      const method = options.method || "GET";
      const pathname = url.pathname;

      if (method === "GET" && /\/contacts\/[^/]+$/.test(pathname)) {
        const email = decodeURIComponent(pathname.split("/").pop()).toLowerCase();
        const found = [...state.contacts.values()].find((item) => item.properties.email === email);
        if (!found) return response(404, { status: "error" });
        const companyIds = state.associations
          .filter((association) => association.fromType === "contact" && association.fromId === found.id && association.toType === "company")
          .map((association) => ({ id: association.toId }));
        return response(200, { ...found, associations: { companies: { results: companyIds } } });
      }
      if (method === "POST" && pathname.endsWith("/contacts/search")) {
        const phone = parseBody(options).filterGroups?.[0]?.filters?.[0]?.value;
        const found = [...state.contacts.values()].find((item) => item.properties.phone === phone);
        return response(200, { results: found ? [found] : [] });
      }
      if (method === "POST" && pathname.endsWith("/contacts")) {
        const created = record(sequence++, parseBody(options).properties);
        state.contacts.set(created.id, created);
        return response(201, created);
      }
      if (method === "PATCH" && /\/contacts\/[^/]+$/.test(pathname)) {
        const id = pathname.split("/").pop();
        const existing = state.contacts.get(id);
        existing.properties = { ...existing.properties, ...parseBody(options).properties };
        return response(200, existing);
      }
      if (method === "POST" && pathname.endsWith("/companies/search")) {
        const domain = parseBody(options).filterGroups?.[0]?.filters?.[0]?.value?.toLowerCase();
        const found = [...state.companies.values()].find((item) => item.properties.domain === domain);
        return response(200, { results: found ? [found] : [] });
      }
      if (method === "POST" && pathname.endsWith("/companies")) {
        const created = record(sequence++, parseBody(options).properties);
        state.companies.set(created.id, created);
        return response(201, created);
      }
      if (method === "GET" && /\/companies\/[^/]+$/.test(pathname)) {
        const id = pathname.split("/").pop();
        const found = state.companies.get(id);
        return found ? response(200, found) : response(404, { status: "error" });
      }
      if (method === "PATCH" && /\/companies\/[^/]+$/.test(pathname)) {
        const id = pathname.split("/").pop();
        const existing = state.companies.get(id);
        existing.properties = { ...existing.properties, ...parseBody(options).properties };
        return response(200, existing);
      }
      if (method === "GET" && /\/deals\/[^/]+$/.test(pathname)) {
        const eventId = decodeURIComponent(pathname.split("/").pop());
        const found = [...state.deals.values()].find((item) => item.properties.swell_event_id === eventId);
        return found ? response(200, found) : response(404, { status: "error" });
      }
      if (method === "POST" && pathname.endsWith("/deals")) {
        const created = record(sequence++, parseBody(options).properties);
        state.deals.set(created.id, created);
        return response(201, created);
      }
      if (method === "POST" && pathname.endsWith("/notes")) {
        const created = record(sequence++, parseBody(options).properties);
        state.notes.set(created.id, created);
        return response(201, created);
      }
      if (method === "POST" && pathname.endsWith("/tasks")) {
        const created = record(sequence++, parseBody(options).properties);
        state.tasks.set(created.id, created);
        return response(201, created);
      }
      if (method === "PUT" && pathname.includes("/associations/default/")) {
        const parts = pathname.split("/");
        const objectsIndex = parts.indexOf("objects");
        state.associations.push({
          fromType: parts[objectsIndex + 1],
          fromId: parts[objectsIndex + 2],
          toType: parts[objectsIndex + 5],
          toId: parts[objectsIndex + 6]
        });
        return response(200, { status: "COMPLETE" });
      }
      return response(500, { message: `Unmocked HubSpot route: ${method} ${pathname}` });
    }
  };
}

const hubspot = hubSpotMock();
let hubspotResult = await processHubSpotEvent(forwardedEvent, { accessToken: "test-token", ownerId: "owner-1", fetchImpl: hubspot.fetch });
if (hubspotResult.status !== "processed" || !hubspotResult.contactId || !hubspotResult.companyId || hubspotResult.dealId) issues.push("HubSpot adapter did not create the expected lead contact/company/note shape");
if (hubspot.state.notes.size !== 1) issues.push("HubSpot adapter did not create exactly one lead activity note");
if (hubspot.state.tasks.size !== 1 || !hubspotResult.taskId) issues.push("HubSpot adapter did not create exactly one owned lead response task");

hubspotResult = await processHubSpotEvent(forwardedEvent, { accessToken: "test-token", ownerId: "owner-1", fetchImpl: hubspot.fetch });
if (hubspotResult.status !== "duplicate" || hubspot.state.notes.size !== 1 || hubspot.state.tasks.size !== 1) issues.push("HubSpot adapter did not suppress an exact event replay");

const qualifiedVoiceEvent = structuredClone(forwardedVapiEvent);
qualifiedVoiceEvent.eventId = "vapi_call_qualified_456";
qualifiedVoiceEvent.sourceEventId = "call_qualified_456";
qualifiedVoiceEvent.contact.email = "jamie@northstar.example";
qualifiedVoiceEvent.company = structuredClone(forwardedEvent.company);
qualifiedVoiceEvent.contact.doNotContact = false;
qualifiedVoiceEvent.contact.followUpConsent = true;
qualifiedVoiceEvent.opportunity.fit = "qualified";
qualifiedVoiceEvent.opportunity.recommendedOffer = "commissioned_baseline";
qualifiedVoiceEvent.opportunity.nextAction = "Schedule human discovery";
hubspotResult = await processHubSpotEvent(qualifiedVoiceEvent, {
  accessToken: "test-token",
  pipelineId: "swell-pipeline",
  qualifiedStageId: "qualified-stage",
  ownerId: "owner-1",
  fetchImpl: hubspot.fetch
});
if (!hubspotResult.dealId || hubspot.state.deals.size !== 1) issues.push("HubSpot adapter did not create one qualified deal");
if (hubspot.state.tasks.size !== 2 || !hubspotResult.taskId) issues.push("HubSpot adapter did not create the qualified follow-up task");
if (hubspotResult.companyId !== [...hubspot.state.companies.keys()][0] || hubspot.state.companies.size !== 1) issues.push("HubSpot adapter duplicated a company for the same domain");
const deal = [...hubspot.state.deals.values()][0];
if (deal?.properties?.amount !== "2500" || deal?.properties?.dealstage !== "qualified-stage") issues.push("HubSpot adapter did not map offer value and qualified stage");

const optOutVoiceEvent = structuredClone(forwardedVapiEvent);
optOutVoiceEvent.contact.email = "jamie@northstar.example";
hubspotResult = await processHubSpotEvent(optOutVoiceEvent, { accessToken: "test-token", ownerId: "owner-1", fetchImpl: hubspot.fetch });
const hubspotContact = hubspot.state.contacts.get(hubspotResult.contactId);
if (hubspotContact?.properties?.swell_do_not_contact !== "true") issues.push("HubSpot adapter did not persist the Vapi opt-out");
if (!hubspotContact?.properties?.swell_next_action?.includes("Suppress contact")) issues.push("HubSpot adapter did not create the suppression action");

async function invokeGtmEvent(body, { secret = "test-gtm-secret", token = "test-token", fetchImpl } = {}) {
  const originalFetch = globalThis.fetch;
  const environment = {
    GTM_WEBHOOK_SECRET: process.env.GTM_WEBHOOK_SECRET,
    HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
    HUBSPOT_PIPELINE_ID: process.env.HUBSPOT_PIPELINE_ID,
    HUBSPOT_STAGE_QUALIFIED: process.env.HUBSPOT_STAGE_QUALIFIED
  };
  if (fetchImpl) globalThis.fetch = fetchImpl;
  process.env.GTM_WEBHOOK_SECRET = "test-gtm-secret";
  if (token === null) delete process.env.HUBSPOT_ACCESS_TOKEN;
  else process.env.HUBSPOT_ACCESS_TOKEN = token;
  const response = responseHarness();
  try {
    await gtmEventsHandler({ method: "POST", headers: { authorization: `Bearer ${secret}` }, body }, response);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  return { status: response.statusCode, body: JSON.parse(response.body) };
}

result = await invokeGtmEvent(forwardedEvent, { secret: "wrong-secret", fetchImpl: hubspot.fetch });
if (result.status !== 401 || result.body.code !== "unauthorized") issues.push("GTM event endpoint did not reject an invalid bearer secret");

result = await invokeGtmEvent(forwardedEvent, { token: null, fetchImpl: hubspot.fetch });
if (result.status !== 503 || result.body.code !== "hubspot_unconfigured") issues.push("GTM event endpoint did not fail closed without a HubSpot token");

result = await invokeGtmEvent({ eventType: "unknown", eventId: "bad", occurredAt: new Date().toISOString() }, { fetchImpl: hubspot.fetch });
if (result.status !== 400 || result.body.code !== "invalid_event") issues.push("GTM event endpoint did not reject an unknown event type");

const endpointHubspot = hubSpotMock();
result = await invokeGtmEvent({ ...forwardedEvent, eventId: "lead_endpoint_test" }, { fetchImpl: endpointHubspot.fetch });
if (result.status !== 202 || !result.body.contactId || endpointHubspot.state.contacts.size !== 1) issues.push("GTM event endpoint did not persist a valid lead into HubSpot");

if (issues.length) {
  console.error("GTM system check failed:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(`GTM system check passed: ${model.offers.length} offers, ${model.lifecycleStages.length} stages, ${model.qualification.dimensions.length} qualification dimensions, ${hubspotManifest.contactProperties.length + hubspotManifest.dealProperties.length} HubSpot properties, and endpoint failure/success paths verified.`);
