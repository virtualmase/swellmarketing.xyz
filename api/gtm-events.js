import { timingSafeEqual } from "node:crypto";
import { HubSpotError } from "../lib/hubspot-client.js";
import { processHubSpotEvent } from "../lib/hubspot-adapter.js";

const ALLOWED_EVENTS = new Set([
  "lead.requested_contact",
  "voice.call_completed",
  "opportunity.qualified",
  "meeting.booked",
  "meeting.held",
  "meeting.no_show",
  "proposal.sent",
  "proposal.accepted"
]);

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function safeEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { ok: false, code: "method_not_allowed" });
  }
  const expected = process.env.GTM_WEBHOOK_SECRET;
  const supplied = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || !safeEqual(supplied, expected)) return json(response, 401, { ok: false, code: "unauthorized" });
  if (!process.env.HUBSPOT_ACCESS_TOKEN) return json(response, 503, { ok: false, code: "hubspot_unconfigured" });

  const event = request.body || {};
  if (!ALLOWED_EVENTS.has(event.eventType) || !event.eventId || !event.occurredAt) {
    return json(response, 400, { ok: false, code: "invalid_event" });
  }

  try {
    const result = await processHubSpotEvent(event);
    return json(response, result.status === "duplicate" ? 200 : 202, { ok: true, ...result });
  } catch (error) {
    const retryable = error instanceof HubSpotError ? error.retryable : false;
    console.error(JSON.stringify({ code: "hubspot_event_failed", eventId: event.eventId, status: error.status, retryable, message: error.message }));
    return json(response, retryable ? 503 : 422, { ok: false, code: "hubspot_event_failed", retryable });
  }
}
