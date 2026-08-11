import { timingSafeEqual } from "node:crypto";

const ALLOWED_ASSISTANTS = new Set([
  "5b29bf0d-4e97-4b09-8e4f-1d16ea725591"
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

function bearer(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function structuredOutcome(message) {
  const collections = [
    message.artifact?.structuredOutputs,
    message.call?.artifact?.structuredOutputs,
    message.analysis?.structuredOutputs,
    message.call?.analysis?.structuredOutputs
  ].filter(Array.isArray);
  const flattened = collections.flat();
  const named = flattened.find((item) => item?.name === "swell_pipeline_outcome");
  return named?.result || named?.value || named?.output || named || null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { ok: false, code: "method_not_allowed" });
  }

  const expectedSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (!expectedSecret || !safeEqual(bearer(request), expectedSecret)) {
    return json(response, 401, { ok: false, code: "unauthorized" });
  }

  const message = request.body?.message || request.body || {};
  if (message.type !== "end-of-call-report") return json(response, 200, { ok: true, code: "ignored_event" });

  const call = message.call || {};
  const assistantId = call.assistantId || message.assistant?.id || message.assistantId;
  if (!ALLOWED_ASSISTANTS.has(assistantId)) return json(response, 403, { ok: false, code: "assistant_not_allowed" });
  if (!call.id) return json(response, 400, { ok: false, code: "missing_call_id" });

  const outcome = structuredOutcome(message) || {};
  const occurredAt = call.endedAt || message.endedAt || new Date().toISOString();
  const event = {
    schemaVersion: "1.0.0",
    eventId: `vapi_${call.id}`,
    eventType: "voice.call_completed",
    occurredAt,
    actorType: "agent",
    actorId: assistantId,
    sourceSystem: "vapi",
    sourceEventId: call.id,
    call: {
      id: call.id,
      direction: call.type === "outboundPhoneCall" ? "outbound" : "inbound",
      status: call.status || "ended",
      endedReason: call.endedReason || message.endedReason || "unknown",
      startedAt: call.startedAt || call.createdAt || null,
      endedAt: call.endedAt || null,
      durationSeconds: typeof message.durationSeconds === "number" ? message.durationSeconds : null,
      costUsd: typeof call.cost === "number" ? call.cost : null,
      transcript: message.artifact?.transcript || call.artifact?.transcript || null,
      summary: message.analysis?.summary || call.analysis?.summary || null,
      evaluation: message.analysis?.successEvaluation || call.analysis?.successEvaluation || null
    },
    contact: {
      name: outcome.contactName || null,
      email: outcome.workEmail || null,
      phone: call.customer?.number || null,
      role: outcome.role || null,
      preferredChannel: outcome.preferredChannel || "unknown",
      followUpConsent: outcome.followUpConsent === true,
      doNotContact: outcome.doNotContact === true
    },
    company: {
      name: outcome.companyName || null,
      website: outcome.website || null
    },
    opportunity: {
      trigger: outcome.trigger || null,
      commercialConsequence: outcome.commercialConsequence || null,
      firstConstraint: outcome.firstConstraint || "unclear",
      authority: outcome.authority || "unknown",
      evidenceAccess: outcome.evidenceAccess || "unknown",
      timeline: outcome.timeline || "unknown",
      fit: outcome.fit || "unknown",
      recommendedOffer: outcome.recommendedOffer || "unknown",
      nextAction: outcome.nextAction || null,
      objections: Array.isArray(outcome.objections) ? outcome.objections : []
    },
    guardrails: {
      unsupportedActionClaimed: outcome.unsupportedActionClaimed === true,
      requiresImmediateOptOutProcessing: outcome.doNotContact === true
    }
  };

  const webhookUrl = process.env.GTM_WEBHOOK_URL;
  if (!webhookUrl) return json(response, 503, { ok: false, code: "destination_unconfigured" });

  let destination;
  try {
    destination = new URL(webhookUrl);
    if (destination.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    return json(response, 503, { ok: false, code: "destination_invalid" });
  }

  try {
    const forwarded = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Swell-GTM/1.0",
        ...(process.env.GTM_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.GTM_WEBHOOK_SECRET}` } : {})
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(8000)
    });
    if (!forwarded.ok) return json(response, 502, { ok: false, code: "destination_rejected" });
  } catch {
    return json(response, 502, { ok: false, code: "destination_failed" });
  }

  return json(response, 202, { ok: true, code: "accepted", eventId: event.eventId });
}
