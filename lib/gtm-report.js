const CRM_VERSION = "2026-03";
const API_ROOT = "https://api.hubapi.com";

async function listHubSpotObjects(objectType, properties, { accessToken, fetchImpl }) {
  const results = [];
  let after = "";
  do {
    const params = new URLSearchParams({ limit: "100", properties: properties.join(",") });
    if (after) params.set("after", after);
    const response = await fetchImpl(`${API_ROOT}/crm/objects/${CRM_VERSION}/${objectType}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`Could not read ${objectType}: ${response.status} ${JSON.stringify(body)}`);
    results.push(...(body.results || []));
    after = body.paging?.next?.after || "";
  } while (after);
  return results;
}

const countBy = (records, property) => records.reduce((counts, record) => {
  const value = record.properties?.[property] || "unset";
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});

const isOpenTask = (task) => !["COMPLETED", "DEFERRED"].includes(task.properties?.hs_task_status);
const isTrue = (value) => value === true || value === "true";
const isOpenDeal = (deal) => !isTrue(deal.properties?.hs_is_closed);
const isWonDeal = (deal) => isTrue(deal.properties?.hs_is_closed_won);
const isOverdue = (record, property, now) => {
  const value = record.properties?.[property];
  return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) < now);
};

export async function getGtmSnapshot({
  accessToken = process.env.HUBSPOT_ACCESS_TOKEN,
  fetchImpl = globalThis.fetch,
  now = new Date()
} = {}) {
  if (!accessToken) throw new Error("HUBSPOT_ACCESS_TOKEN is required in the current shell.");
  const [contacts, deals, tasks] = await Promise.all([
    listHubSpotObjects("contacts", ["hubspot_owner_id", "lifecyclestage", "swell_last_event_ids", "swell_source", "swell_fit", "swell_do_not_contact", "swell_next_action", "swell_next_action_at", "swell_meeting_booked_at", "swell_meeting_held_at", "swell_meeting_no_show_at", "swell_proposal_sent_at", "swell_proposal_accepted_at", "createdate"], { accessToken, fetchImpl }),
    listHubSpotObjects("deals", ["dealstage", "amount", "hubspot_owner_id", "hs_is_closed", "hs_is_closed_won", "swell_fit", "swell_next_action", "swell_next_action_at", "createdate", "closedate"], { accessToken, fetchImpl }),
    listHubSpotObjects("tasks", ["hs_task_status", "hs_timestamp", "hubspot_owner_id", "hs_task_subject"], { accessToken, fetchImpl })
  ]);

  const timestamp = new Date(now).getTime();
  const swellContacts = contacts.filter((contact) => contact.properties?.swell_last_event_ids);
  const swellDeals = deals.filter((deal) => deal.properties?.swell_fit || deal.properties?.swell_next_action);
  const swellTasks = tasks.filter((task) => task.properties?.hs_task_subject?.startsWith("Swell:"));
  const closedWonDeals = swellDeals.filter(isWonDeal);

  return {
    generatedAt: new Date(now).toISOString(),
    contacts: {
      accountTotal: contacts.length,
      swellTotal: swellContacts.length,
      connected: swellContacts.filter((contact) => ["opportunity", "customer", "evangelist"].includes(contact.properties?.lifecyclestage)).length,
      bySource: countBy(swellContacts, "swell_source"),
      byFit: countBy(swellContacts, "swell_fit"),
      doNotContact: swellContacts.filter((contact) => contact.properties?.swell_do_not_contact === "true").length,
      ownerless: swellContacts.filter((contact) => !contact.properties?.hubspot_owner_id).length
    },
    funnel: {
      meetingsBooked: swellContacts.filter((contact) => contact.properties?.swell_meeting_booked_at).length,
      meetingsHeld: swellContacts.filter((contact) => contact.properties?.swell_meeting_held_at).length,
      meetingNoShows: swellContacts.filter((contact) => contact.properties?.swell_meeting_no_show_at).length,
      proposalsSent: swellContacts.filter((contact) => contact.properties?.swell_proposal_sent_at).length,
      proposalsAccepted: swellContacts.filter((contact) => contact.properties?.swell_proposal_accepted_at).length
    },
    pipeline: {
      accountTotalDeals: deals.length,
      swellTotalDeals: swellDeals.length,
      byStage: countBy(swellDeals, "dealstage"),
      openAmount: swellDeals.filter(isOpenDeal).reduce((sum, deal) => sum + Number(deal.properties?.amount || 0), 0),
      closedWonCount: closedWonDeals.length,
      closedWonRevenue: closedWonDeals.reduce((sum, deal) => sum + Number(deal.properties?.amount || 0), 0),
      openWithoutNextAction: swellDeals.filter((deal) => isOpenDeal(deal) && !deal.properties?.swell_next_action).length,
      overdueNextActions: swellDeals.filter((deal) => isOpenDeal(deal) && isOverdue(deal, "swell_next_action_at", timestamp)).length,
      ownerlessOpenDeals: swellDeals.filter((deal) => isOpenDeal(deal) && !deal.properties?.hubspot_owner_id).length
    },
    tasks: {
      accountTotal: tasks.length,
      swellTotal: swellTasks.length,
      byStatus: countBy(swellTasks, "hs_task_status"),
      open: swellTasks.filter(isOpenTask).length,
      overdue: swellTasks.filter((task) => isOpenTask(task) && isOverdue(task, "hs_timestamp", timestamp)).length,
      ownerlessOpen: swellTasks.filter((task) => isOpenTask(task) && !task.properties?.hubspot_owner_id).length
    }
  };
}
