import { createHash } from "node:crypto";

const ALLOWED_TIMELINES = new Set(["within_30_days", "within_90_days", "this_year", "exploring"]);
const ALLOWED_CONSTRAINTS = new Set(["entity_definition", "crawler_access", "evidence", "corroboration", "measurement", "unclear"]);
const TRUSTED_ORIGINS = new Set([
  "https://swellmarketing.xyz",
  "https://www.swellmarketing.xyz",
  "https://aure.swellmarketing.xyz"
]);
const AURE_HOSTNAMES = new Set([
  "aure.swellmarketing.xyz",
  "aure.autonomousresourcemanagement.com"
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 20_000;
const MIN_FORM_AGE_MS = 2_500;
const MAX_FORM_AGE_MS = 6 * 60 * 60 * 1000;

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boolean(value) {
  return value === true || value === "true" || value === "on";
}

function header(request, name) {
  return String(request.headers?.[name] || "").trim();
}

function normalizeWebsite(value) {
  const candidate = text(value, 500);
  if (!candidate) return "";
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function hostname(value) {
  try {
    return new URL(text(value, 1000)).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isAureOriginated(body) {
  const source = text(body.utmSource, 200).toLowerCase();
  const latestSource = text(body.latestUtmSource, 200).toLowerCase();
  return source === "aure" || latestSource === "aure" || AURE_HOSTNAMES.has(hostname(body.referrer)) || AURE_HOSTNAMES.has(hostname(body.latestReferrer));
}

export function inquiryOriginDetail(body, isAure) {
  if (!isAure) return "";
  const campaign = text(body.utmCampaign, 200) || text(body.latestUtmCampaign, 200);
  const content = text(body.utmContent, 200) || text(body.latestUtmContent, 200);
  const referringHost = hostname(body.referrer) || hostname(body.latestReferrer);
  return [campaign && `campaign=${campaign}`, content && `content=${content}`, referringHost && `referrer=${referringHost}`]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 1000);
}

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

function authorizedWebhookHeaders(secret) {
  return {
    "Content-Type": "application/json",
    "User-Agent": "Swell-GTM/1.1",
    ...(secret ? { Authorization: `Bearer ${secret}` } : {})
  };
}

function trustedOrigin(request) {
  const origin = header(request, "origin");
  if (!origin) return "";
  try {
    const normalized = new URL(origin).origin;
    return TRUSTED_ORIGINS.has(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function isJsonRequest(request) {
  return header(request, "content-type").toLowerCase().startsWith("application/json");
}

function validFormAge(value) {
  const startedAt = Number(value);
  if (!Number.isFinite(startedAt)) return false;
  const age = Date.now() - startedAt;
  return age >= MIN_FORM_AGE_MS && age <= MAX_FORM_AGE_MS;
}

function sourceIp(request) {
  return header(request, "x-forwarded-for").split(",")[0].trim();
}

async function verifyTurnstile(body, request) {
  const siteKey = text(process.env.TURNSTILE_SITE_KEY, 500);
  const secret = text(process.env.TURNSTILE_SECRET_KEY, 500);
  const configured = Boolean(siteKey || secret);
  if (!configured) return { state: "not_configured" };
  if (!siteKey || !secret) return { state: "misconfigured" };

  const token = text(body.turnstileToken, 2_048);
  if (!token) return { state: "failed" };

  try {
    const payload = new URLSearchParams({ secret, response: token });
    const ip = sourceIp(request);
    if (ip) payload.set("remoteip", ip);
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
      signal: AbortSignal.timeout(5_000)
    });
    const result = await verification.json();
    return result?.success === true ? { state: "verified" } : { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

export function inferSource(body) {
  const source = text(body.utmSource, 200).toLowerCase();
  const medium = text(body.utmMedium, 200).toLowerCase();
  const referrer = text(body.referrer, 1000).toLowerCase();
  if (isAureOriginated(body)) return "aure";
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
  const allowedOrigin = trustedOrigin(request);
  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
  }
  if (request.method === "OPTIONS") {
    if (!allowedOrigin) return json(response, 403, { ok: false, code: "origin_not_allowed" });
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Max-Age", "86400");
    return response.status(204).end();
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { ok: false, code: "method_not_allowed" });
  }
  if (!allowedOrigin) return json(response, 403, { ok: false, code: "origin_not_allowed" });
  if (!isJsonRequest(request)) return json(response, 415, { ok: false, code: "unsupported_media_type" });

  const declaredLength = Number(header(request, "content-length") || 0);
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
  if (!validFormAge(body.formStartedAt)) fieldErrors.formStartedAt = "Please take a moment to complete the request before submitting.";
  if (Object.keys(fieldErrors).length) return json(response, 400, { ok: false, code: "validation_failed", fieldErrors });

  const turnstile = await verifyTurnstile(body, request);
  if (turnstile.state === "misconfigured") {
    console.error(JSON.stringify({ code: "turnstile_misconfigured" }));
    return json(response, 503, { ok: false, code: "temporarily_unavailable" });
  }
  if (turnstile.state === "failed") return json(response, 403, { ok: false, code: "challenge_failed" });

  const receivedAt = new Date().toISOString();
  const aureOriginated = isAureOriginated(body);
  const origin = aureOriginated ? "aure" : "general";
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
      inquiryOrigin: origin,
      inquiryOriginDetail: inquiryOriginDetail(body, aureOriginated),
      nextAction: "Review request and respond",
      nextActionAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    },
    attribution: {
      sourcePage: text(body.sourcePage, 500) || "/contact/",
      referrer: text(body.referrer, 1000),
      utmSource: text(body.utmSource, 200),
      utmMedium: text(body.utmMedium, 200),
      utmCampaign: text(body.utmCampaign, 200),
      utmContent: text(body.utmContent, 200),
      latestTouch: {
        sourcePage: text(body.latestSourcePage, 500),
        referrer: text(body.latestReferrer, 1000),
        utmSource: text(body.latestUtmSource, 200),
        utmMedium: text(body.latestUtmMedium, 200),
        utmCampaign: text(body.latestUtmCampaign, 200),
        utmContent: text(body.latestUtmContent, 200)
      }
    },
    intakeProtection: {
      formAgeValidated: true,
      turnstile: turnstile.state === "verified" ? "verified" : "not_configured"
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
      signal: AbortSignal.timeout(8_000)
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
