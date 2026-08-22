import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/leads.js";

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    end(body) {
      this.body = body;
    }
  };
}

test("AURE intake-host preflight is allowed without opening the endpoint to arbitrary origins", async () => {
  const request = {
    method: "OPTIONS",
    headers: {
      origin: "https://aure.swellmarketing.xyz"
    }
  };
  const response = makeResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], "https://aure.swellmarketing.xyz");
  assert.equal(response.headers["access-control-allow-methods"], "POST, OPTIONS");
});

test("untrusted cross-origin preflight is rejected", async () => {
  const request = {
    method: "OPTIONS",
    headers: {
      origin: "https://example.invalid"
    }
  };
  const response = makeResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});

test("mocked AURE OMNY inquiry creates an attributed normalized event without a real downstream request", async () => {
  const originalFetch = globalThis.fetch;
  const originalWebhookUrl = process.env.GTM_WEBHOOK_URL;
  const originalWebhookSecret = process.env.GTM_WEBHOOK_SECRET;
  const capturedEvents = [];

  process.env.GTM_WEBHOOK_URL = "https://lead-test.invalid/events";
  process.env.GTM_WEBHOOK_SECRET = "test-secret";
  globalThis.fetch = async (_url, options) => {
    capturedEvents.push(JSON.parse(options.body));
    return { ok: true, status: 202 };
  };

  try {
    const body = {
      company: "",
      name: "AURE attribution test",
      email: "aure-tracking-test@example.invalid",
      role: "QA",
      website: "https://example.invalid",
      trigger: "This non-production test verifies AURE public-record attribution through the Swell contact endpoint.",
      commercialConsequence: "No commercial impact. This is a safe QA record.",
      responseConsent: true,
      marketingConsent: false,
      timeline: "exploring",
      firstConstraint: "evidence",
      formStartedAt: Date.now() - 3_000,
      sourcePage: "/contact/",
      referrer: "https://aure.swellmarketing.xyz/omny-audit",
      utmSource: "aure",
      utmMedium: "referral",
      utmCampaign: "aure_public_record",
      utmContent: "omny_audit",
      latestSourcePage: "/contact/",
      latestReferrer: "https://aure.swellmarketing.xyz/omny-audit",
      latestUtmSource: "aure",
      latestUtmMedium: "referral",
      latestUtmCampaign: "aure_public_record",
      latestUtmContent: "omny_audit"
    };
    const request = {
      method: "POST",
      headers: {
        origin: "https://swellmarketing.xyz",
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(JSON.stringify(body)))
      },
      body
    };
    const response = makeResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 202);
    assert.deepEqual(JSON.parse(response.body).ok, true);
    assert.equal(capturedEvents.length, 1);
    assert.equal(capturedEvents[0].opportunity.source, "aure");
    assert.equal(capturedEvents[0].opportunity.inquiryOrigin, "aure");
    assert.match(capturedEvents[0].opportunity.inquiryOriginDetail, /campaign=aure_public_record/);
    assert.match(capturedEvents[0].opportunity.inquiryOriginDetail, /content=omny_audit/);
    assert.equal(capturedEvents[0].attribution.referrer, "https://aure.swellmarketing.xyz/omny-audit");
    assert.equal(capturedEvents[0].attribution.utmSource, "aure");
    assert.equal(capturedEvents[0].attribution.utmCampaign, "aure_public_record");
    assert.equal(capturedEvents[0].attribution.utmContent, "omny_audit");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWebhookUrl === undefined) delete process.env.GTM_WEBHOOK_URL;
    else process.env.GTM_WEBHOOK_URL = originalWebhookUrl;
    if (originalWebhookSecret === undefined) delete process.env.GTM_WEBHOOK_SECRET;
    else process.env.GTM_WEBHOOK_SECRET = originalWebhookSecret;
  }
});
