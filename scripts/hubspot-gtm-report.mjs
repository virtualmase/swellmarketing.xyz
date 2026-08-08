#!/usr/bin/env node

const token = process.env.HUBSPOT_ACCESS_TOKEN;
if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is required in the current shell.");

async function list(objectType, properties) {
  const results = [];
  let after = "";
  do {
    const params = new URLSearchParams({ limit: "100", properties: properties.join(",") });
    if (after) params.set("after", after);
    const response = await fetch(`https://api.hubapi.com/crm/objects/2026-03/${objectType}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok) throw new Error(`Could not read ${objectType}: ${response.status} ${JSON.stringify(body)}`);
    results.push(...(body.results || []));
    after = body.paging?.next?.after || "";
  } while (after);
  return results;
}

const [contacts, deals, tasks] = await Promise.all([
  list("contacts", ["hubspot_owner_id", "swell_last_event_ids", "swell_source", "swell_fit", "swell_do_not_contact", "swell_next_action", "swell_next_action_at", "createdate"]),
  list("deals", ["dealstage", "amount", "hubspot_owner_id", "swell_fit", "swell_next_action", "swell_next_action_at", "createdate", "closedate"]),
  list("tasks", ["hs_task_status", "hs_timestamp", "hubspot_owner_id", "hs_task_subject"])
]);

const now = Date.now();
const countBy = (records, property) => records.reduce((counts, record) => {
  const value = record.properties?.[property] || "unset";
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});
const isOpenTask = (task) => !["COMPLETED", "DEFERRED"].includes(task.properties?.hs_task_status);
const isOpenDeal = (deal) => !["closedwon", "closedlost"].includes(deal.properties?.dealstage);
const isOverdue = (record, property) => {
  const value = record.properties?.[property];
  return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) < now);
};
const swellContacts = contacts.filter((contact) => contact.properties?.swell_last_event_ids);
const swellDeals = deals.filter((deal) => deal.properties?.swell_fit || deal.properties?.swell_next_action);
const swellTasks = tasks.filter((task) => task.properties?.hs_task_subject?.startsWith("Swell:"));

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  contacts: {
    accountTotal: contacts.length,
    swellTotal: swellContacts.length,
    bySource: countBy(swellContacts, "swell_source"),
    byFit: countBy(swellContacts, "swell_fit"),
    doNotContact: swellContacts.filter((contact) => contact.properties?.swell_do_not_contact === "true").length,
    ownerless: swellContacts.filter((contact) => !contact.properties?.hubspot_owner_id).length
  },
  pipeline: {
    accountTotalDeals: deals.length,
    swellTotalDeals: swellDeals.length,
    byStage: countBy(swellDeals, "dealstage"),
    openAmount: swellDeals.filter(isOpenDeal).reduce((sum, deal) => sum + Number(deal.properties?.amount || 0), 0),
    openWithoutNextAction: swellDeals.filter((deal) => isOpenDeal(deal) && !deal.properties?.swell_next_action).length,
    overdueNextActions: swellDeals.filter((deal) => isOpenDeal(deal) && isOverdue(deal, "swell_next_action_at")).length,
    ownerlessOpenDeals: swellDeals.filter((deal) => isOpenDeal(deal) && !deal.properties?.hubspot_owner_id).length
  },
  tasks: {
    accountTotal: tasks.length,
    swellTotal: swellTasks.length,
    byStatus: countBy(swellTasks, "hs_task_status"),
    open: swellTasks.filter(isOpenTask).length,
    overdue: swellTasks.filter((task) => isOpenTask(task) && isOverdue(task, "hs_timestamp")).length,
    ownerlessOpen: swellTasks.filter((task) => isOpenTask(task) && !task.properties?.hubspot_owner_id).length
  }
}, null, 2));
