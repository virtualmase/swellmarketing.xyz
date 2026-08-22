import assert from "node:assert/strict";
import test from "node:test";

import { contactProperties } from "../lib/hubspot-adapter.js";

test("milestone events set their timestamp without clearing established qualification or consent", () => {
  const properties = contactProperties({
    eventId: "meeting-1",
    eventType: "meeting.held",
    occurredAt: "2026-08-19T18:00:00.000Z",
    sourceSystem: "hubspot_workflow",
    contact: { email: "BUYER@example.com" },
    opportunity: { nextAction: "Send scope" }
  }, {
    properties: {
      swell_last_event_ids: "meeting-booked-1",
      swell_source: "partner",
      swell_fit: "qualified",
      swell_response_consent: "true",
      swell_marketing_consent: "true"
    }
  }, "owner-1");

  assert.equal(properties.email, "buyer@example.com");
  assert.equal(properties.swell_meeting_held_at, "2026-08-19T18:00:00.000Z");
  assert.equal(properties.swell_next_action, "Send scope");
  assert.equal(properties.swell_source, undefined);
  assert.equal(properties.swell_fit, undefined);
  assert.equal(properties.swell_response_consent, undefined);
  assert.equal(properties.swell_marketing_consent, undefined);
  assert.match(properties.swell_last_event_ids, /meeting-1/);
});

test("a new contact gets safe defaults but no inferred consent", () => {
  const properties = contactProperties({
    eventId: "meeting-2",
    eventType: "meeting.booked",
    occurredAt: "2026-08-19T18:00:00.000Z",
    sourceSystem: "hubspot_workflow",
    contact: { phone: "+15555550100" }
  }, null, undefined);

  assert.equal(properties.swell_source, "unknown");
  assert.equal(properties.swell_fit, "unknown");
  assert.equal(properties.swell_first_constraint, "unclear");
  assert.equal(properties.swell_response_consent, undefined);
  assert.equal(properties.swell_marketing_consent, undefined);
  assert.equal(properties.swell_do_not_contact, "false");
});

test("AURE-originated inquiry data persists as a reportable contact property", () => {
  const properties = contactProperties({
    eventId: "aure-1",
    eventType: "lead.requested_contact",
    occurredAt: "2026-08-22T18:00:00.000Z",
    sourceSystem: "swellmarketing.xyz",
    contact: { email: "aure-buyer@example.com" },
    opportunity: {
      source: "aure",
      inquiryOrigin: "aure",
      inquiryOriginDetail: "campaign=aure_method | content=hero_cta"
    }
  }, null, undefined);

  assert.equal(properties.swell_source, "aure");
  assert.equal(properties.swell_inquiry_origin, "aure");
  assert.match(properties.swell_inquiry_origin_detail, /hero_cta/);
});
