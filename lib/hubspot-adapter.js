import { HubSpotClient, appendEventId, domainFromWebsite, splitName } from "./hubspot-client.js";

const OFFER_AMOUNTS = {
  commissioned_baseline: "2500",
  managed_foundation: "1500",
  managed_growth: "2500",
  managed_scale: "3500"
};

function compact(properties) {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function bool(value) {
  return value === true ? "true" : "false";
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sourceDetail(event) {
  const attribution = event.attribution || {};
  return [attribution.utmCampaign, attribution.utmContent, attribution.referrer].filter(Boolean).join(" | ").slice(0, 1000);
}

function contactProperties(event, existing, ownerId) {
  const contact = event.contact || {};
  const opportunity = event.opportunity || {};
  const consent = contact.consent || {};
  const names = splitName(contact.name || "");
  const doNotContact = contact.doNotContact === true || consent.status === "opted_out" || existing?.properties?.swell_do_not_contact === "true";
  return compact({
    email: contact.email?.toLowerCase(),
    phone: contact.phone,
    firstname: names.firstname,
    lastname: names.lastname,
    jobtitle: contact.role,
    website: event.company?.website,
    company: event.company?.name,
    hubspot_owner_id: ownerId,
    lifecyclestage: existing ? undefined : "lead",
    swell_last_event_ids: appendEventId(existing?.properties?.swell_last_event_ids, event.eventId),
    swell_source: opportunity.source || "unknown",
    swell_source_detail: sourceDetail(event),
    swell_first_constraint: opportunity.firstConstraint || "unclear",
    swell_trigger: opportunity.trigger,
    swell_commercial_consequence: opportunity.commercialConsequence,
    swell_timeline: opportunity.timeline || "unknown",
    swell_fit: opportunity.fit || "unknown",
    swell_recommended_offer: opportunity.recommendedOffer || "unknown",
    swell_response_consent: bool(consent.response === true || contact.followUpConsent === true),
    swell_marketing_consent: bool(consent.marketing === true),
    swell_do_not_contact: bool(doNotContact),
    swell_consent_at: consent.occurredAt,
    swell_consent_source: consent.source || event.sourceSystem,
    swell_next_action: doNotContact ? "Suppress contact across every outreach system" : opportunity.nextAction,
    swell_next_action_at: opportunity.nextActionAt,
    swell_vapi_call_id: event.sourceSystem === "vapi" ? event.call?.id : undefined
  });
}

function noteBody(event) {
  const opportunity = event.opportunity || {};
  const contact = event.contact || {};
  const call = event.call || {};
  const rows = [
    ["Event", `${event.eventType} · ${event.eventId}`],
    ["Occurred", event.occurredAt],
    ["Trigger", opportunity.trigger],
    ["Commercial consequence", opportunity.commercialConsequence],
    ["First constraint", opportunity.firstConstraint],
    ["Fit", opportunity.fit],
    ["Recommended offer", opportunity.recommendedOffer],
    ["Next action", opportunity.nextAction],
    ["Follow-up consent", contact.followUpConsent ?? contact.consent?.response],
    ["Do not contact", contact.doNotContact ?? false],
    ["Call summary", call.summary],
    ["Call evaluation", call.evaluation],
    ["Transcript", call.transcript]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  return `<strong>Swell GTM event</strong><br>${rows.map(([key, value]) => `<strong>${html(key)}:</strong> ${html(value)}`).join("<br>")}`.slice(0, 60_000);
}

function dealProperties(event, pipeline, stage, ownerId) {
  const opportunity = event.opportunity || {};
  const company = event.company?.name || domainFromWebsite(event.company?.website) || "Unknown company";
  return compact({
    dealname: `${company} — Representation Operations`,
    pipeline,
    dealstage: stage,
    amount: OFFER_AMOUNTS[opportunity.recommendedOffer],
    hubspot_owner_id: ownerId,
    description: opportunity.trigger,
    swell_event_id: event.eventId,
    swell_first_constraint: opportunity.firstConstraint || "unclear",
    swell_trigger: opportunity.trigger,
    swell_commercial_consequence: opportunity.commercialConsequence,
    swell_fit: opportunity.fit || "unknown",
    swell_recommended_offer: opportunity.recommendedOffer || "unknown",
    swell_next_action: opportunity.nextAction,
    swell_next_action_at: opportunity.nextActionAt
  });
}

export async function processHubSpotEvent(event, {
  accessToken = process.env.HUBSPOT_ACCESS_TOKEN,
  pipelineId = process.env.HUBSPOT_PIPELINE_ID,
  qualifiedStageId = process.env.HUBSPOT_STAGE_QUALIFIED,
  ownerId = process.env.HUBSPOT_OWNER_ID,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!event?.eventId || !event?.eventType || !event?.occurredAt) throw new Error("Invalid normalized GTM event.");
  const client = new HubSpotClient({ accessToken, fetchImpl });
  const email = event.contact?.email?.toLowerCase();
  const phone = event.contact?.phone;
  if (!email && !phone) throw new Error("A HubSpot contact requires an email or phone identifier.");

  let contact = email ? await client.getContactByEmail(email) : await client.searchContactByPhone(phone);
  const processed = String(contact?.properties?.swell_last_event_ids || "").split(";").includes(event.eventId);
  if (processed) return { status: "duplicate", eventId: event.eventId, contactId: contact.id };
  const associatedCompanyIds = [...new Set((contact?.associations?.companies?.results || []).map((association) => association.id).filter(Boolean))];

  const properties = contactProperties(event, contact, ownerId);
  contact = contact ? await client.updateContact(contact.id, properties) : await client.createContact(properties);

  const domain = domainFromWebsite(event.company?.website);
  let company = null;
  if (domain) {
    if (associatedCompanyIds.length) {
      const associatedCompanies = await Promise.all(associatedCompanyIds.map((id) => client.getCompanyById(id)));
      company = associatedCompanies.find((associated) => associated?.properties?.domain?.toLowerCase() === domain) || null;
    }
    if (!company) company = await client.getCompanyByDomain(domain);
    const companyProperties = compact({ domain, name: event.company?.name || domain, website: event.company?.website });
    company = company ? await client.updateCompany(company.id, companyProperties) : await client.createCompany(companyProperties);
    await client.associate("contact", contact.id, "company", company.id);
  }

  let deal = null;
  const shouldCreateDeal = event.opportunity?.fit === "qualified";
  const warnings = [];
  if (shouldCreateDeal) {
    if (!pipelineId || !qualifiedStageId) {
      warnings.push("Qualified event was saved without a deal because HubSpot pipeline mapping is incomplete.");
    } else {
      deal = await client.getDealByEventId(event.eventId);
      if (!deal) deal = await client.createDeal(dealProperties(event, pipelineId, qualifiedStageId, ownerId));
      await client.associate("deal", deal.id, "contact", contact.id);
      if (company) await client.associate("deal", deal.id, "company", company.id);
    }
  }

  const note = await client.createNote({ hs_timestamp: event.occurredAt, hs_note_body: noteBody(event) });
  await client.associate("note", note.id, "contact", contact.id);
  if (company) await client.associate("note", note.id, "company", company.id);
  if (deal) await client.associate("note", note.id, "deal", deal.id);

  let task = null;
  if (!ownerId) {
    warnings.push("No response task was created because HUBSPOT_OWNER_ID is not configured.");
  } else {
    const dueAt = new Date(new Date(event.occurredAt).getTime() + (shouldCreateDeal ? 30 : 10) * 60_000).toISOString();
    task = await client.createTask(compact({
      hs_timestamp: dueAt,
      hs_task_subject: shouldCreateDeal ? "Swell: follow up on qualified opportunity" : "Swell: respond to new request",
      hs_task_body: `Review ${event.eventId}. ${event.opportunity?.nextAction || "Confirm fit and the next action."}`,
      hs_task_status: "NOT_STARTED",
      hs_task_priority: "HIGH",
      hs_task_type: "TODO",
      hubspot_owner_id: ownerId
    }));
    await client.associate("task", task.id, "contact", contact.id);
    if (company) await client.associate("task", task.id, "company", company.id);
    if (deal) await client.associate("task", task.id, "deal", deal.id);
  }

  return {
    status: "processed",
    eventId: event.eventId,
    contactId: contact.id,
    companyId: company?.id || null,
    dealId: deal?.id || null,
    noteId: note.id,
    taskId: task?.id || null,
    warnings
  };
}
