import { createHash } from "node:crypto";

const ALLOWED_TIMELINES = new Set(["within_30_days", "within_90_days", "this_year", "exploring"]);
const ALLOWED_CONSTRAINTS = new Set(["entity_definition", "crawler_access", "evidence", "corroboration", "measurement", "unclear"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 20_000;

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boolean(value) {
  return value === true || value === "true" || value === "on";
}

function normalizeWebsite(value) {
  const candidate = text(value, 500);
  if (!candidate) return "";
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function authorizedWebhookHeaders(secret) {
  return {
    "Content-Type": "application/json",
    "User-Agent": "Swell-GTM/1.0",
    ...(secret ? { Authorization: `Bearer ${secret}` } : {})
  };
}

function inferSource(body) {
  const source = text(body.utmSource, 200).toLowerCase();
  const medium = text(body.utmMedium, 200).toLowerCase();
  const referrer = text(body.referrer, 1000).toLowerCase();
  if (medium.includes("paid") || ["cpc", "ppc", "paid_social"].includes(medium)) return "paid";
  if (source.includes("linkedin")) return "linkedin";
  if (source.includes("email") || medium === "email") return "email";
  if (source.includes("partner")) return "partner";
  if (source.includes("outbound")) return "outbound";
  if (referrer.includes("masonnguyengeo.com")) return "mason_research";
  if (/chatgpt|perplexity|claude|copilot|gemini/.test(referrer)) return "organic_ai";
  if (/google\.|bing\.|duckduckgo\.|search\.brave\./.test(referrer)) return "organic_search";
  if (referrer) return "referral";
  return "direct";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { ok: false, code: "method_not_allowed" });
  }

  const declaredLength = Number(request.headers["content-length"] || 0);
  if (declaredLength > MAX_BODY_BYTES) return json(response, 413, { ok: false, code: "payload_too_large" });

  const body = request.body && typeof request.body === "object" ? request.body : {};
  if (text(body.company, 100)) return json(response, 202, { ok: true, code: "accepted" });

  const name = text(body.name, 100);
  const email = text(body.email, 254).toLowerCase();
  const website = normalizeWebsite(body.website);
  const trigger = text(body.trigger, 2000);
  const responseConsent = boolean(body.responseConsent);
  const timeline = ALLOWED_TIMELINES.has(body.timeline) ? body.timeline : "exploring";
  const firstConstraint = ALLOWED_CONSTRAINTS.has(body.firstConstraint) ? body.firstConstraint : "unclear";

  const fieldErrors = {};
  if (name.length < 2) fieldErrors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid work email.";
  if (!website) fieldErrors.website = "Enter a valid company website.";
  if (trigger.length < 20) fieldErrors.trigger = "Describe the problem in at least 20 characters.";
  if (!responseConsent) fieldErrors.responseConsent = "Permission to respond is required.";
  if (Object.keys(fieldErrors).length) return json(response, 400, { ok: false, code: "validation_failed", fieldErrors });

  const receivedAt = new Date().toISOString();
  const idempotencyInput = `${email}|${website}|${trigger.toLowerCase()}|${receivedAt.slice(0, 13)}`;
  const eventId = `lead_${createHash("sha256").update(idempotencyInput).digest("hex").slice(0, 24)}`;
  const event = {
    schemaVersion: "1.0.0",
    eventId,
    eventType: "lead.requested_contact",
    occurredAt: receivedAt,
    actorType: "prospect",
    sourceSystem: "swellmarketing.xyz",
    contact: {
      name,
      email,
      role: text(body.role, 120),
      preferredChannel: "email",
      consent: {
        status: "requested_contact",
        response: true,
        marketing: boolean(body.marketingConsent),
        source: "website_request_form",
        occurredAt: receivedAt
      }
    },
    company: { website },
    opportunity: {
      lifecycleStage: "lead",
      trigger,
      commercialConsequence: text(body.commercialConsequence, 2000),
      timeline,
      firstConstraint,
      source: inferSource(body),
      nextAction: "Review request and respond",
      nextActionAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    },
    attribution: {
      sourcePage: text(body.sourcePage, 500) || "/contact/",
      referrer: text(body.referrer, 1000),
      utmSource: text(body.utmSource, 200),
      utmMedium: text(body.utmMedium, 200),
      utmCampaign: text(body.utmCampaign, 200),
      utmContent: text(body.utmContent, 200)
    }
  };

  const webhookUrl = process.env.GTM_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(JSON.stringify({ code: "gtm_destination_unconfigured", eventId }));
    return json(response, 503, { ok: false, code: "temporarily_unavailable" });
  }

  let destination;
  try {
    destination = new URL(webhookUrl);
    if (destination.protocol !== "https:") throw new Error("Webhook must use HTTPS.");
  } catch {
    console.error(JSON.stringify({ code: "gtm_destination_invalid", eventId }));
    return json(response, 503, { ok: false, code: "temporarily_unavailable" });
  }

  try {
    const forwarded = await fetch(destination, {
      method: "POST",
      headers: authorizedWebhookHeaders(process.env.GTM_WEBHOOK_SECRET),
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(8000)
    });
    if (!forwarded.ok) {
      console.error(JSON.stringify({ code: "gtm_destination_rejected", eventId, status: forwarded.status }));
      return json(response, 502, { ok: false, code: "temporarily_unavailable" });
    }
  } catch (error) {
    console.error(JSON.stringify({ code: "gtm_destination_failed", eventId, message: error.message }));
    return json(response, 502, { ok: false, code: "temporarily_unavailable" });
  }

  return json(response, 202, { ok: true, code: "accepted", eventId });
}
