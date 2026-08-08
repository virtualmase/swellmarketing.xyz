#!/usr/bin/env node

import { processHubSpotEvent } from "../lib/hubspot-adapter.js";

for (const key of ["HUBSPOT_ACCESS_TOKEN", "HUBSPOT_PIPELINE_ID", "HUBSPOT_STAGE_QUALIFIED"]) {
  if (!process.env[key]) throw new Error(`${key} is required in the current shell.`);
}

const runId = new Date().toISOString().replaceAll(/\D/g, "").slice(0, 14);
const occurredAt = new Date().toISOString();
const contact = {
  name: "Swell GTM Test",
  email: `gtm-test-${runId}@example.com`,
  role: "Integration test",
  consent: {
    response: true,
    marketing: false,
    occurredAt,
    source: "controlled_live_test"
  }
};
const company = { name: `Swell GTM Test ${runId}`, website: `https://gtm-test-${runId}.example.com` };
const base = {
  occurredAt,
  sourceSystem: "controlled_live_test",
  contact,
  company,
  attribution: { utmCampaign: "controlled_live_test" }
};

const lead = {
  ...base,
  eventType: "lead.requested_contact",
  eventId: `hubspot_live_lead_${runId}`,
  opportunity: {
    source: "direct",
    firstConstraint: "measurement",
    trigger: "Controlled HubSpot integration validation",
    commercialConsequence: "Validate CRM routing before launch",
    timeline: "within_30_days",
    fit: "unknown",
    recommendedOffer: "unknown",
    nextAction: "Verify synthetic CRM records"
  }
};

const qualified = {
  ...base,
  eventType: "opportunity.qualified",
  eventId: `hubspot_live_qualified_${runId}`,
  opportunity: {
    ...lead.opportunity,
    fit: "qualified",
    recommendedOffer: "commissioned_baseline",
    nextAction: "Delete or retain controlled test fixture"
  }
};

console.log("Creating controlled lead fixture...");
const leadResult = await processHubSpotEvent(lead);
console.log(JSON.stringify(leadResult, null, 2));

console.log("Replaying lead event to validate duplicate protection...");
const replayResult = await processHubSpotEvent(lead);
console.log(JSON.stringify(replayResult, null, 2));
if (replayResult.status !== "duplicate") throw new Error("Duplicate protection failed.");

console.log("Creating controlled qualified opportunity...");
const qualifiedResult = await processHubSpotEvent(qualified);
console.log(JSON.stringify(qualifiedResult, null, 2));
if (!qualifiedResult.dealId) throw new Error("Qualified event did not create a deal.");
if (qualifiedResult.companyId !== leadResult.companyId) throw new Error("Company deduplication failed: lead and qualified events resolved to different companies.");

console.log("Live HubSpot test passed. No token value was printed.");
