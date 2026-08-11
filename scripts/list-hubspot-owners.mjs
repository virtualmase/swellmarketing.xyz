#!/usr/bin/env node

const token = process.env.HUBSPOT_ACCESS_TOKEN;
if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is required in the current shell.");

const response = await fetch("https://api.hubapi.com/crm/v3/owners?limit=100", {
  headers: { Authorization: `Bearer ${token}` }
});
const body = await response.json();
if (!response.ok) throw new Error(`Could not list HubSpot owners: ${response.status} ${JSON.stringify(body)}`);

const owners = (body.results || [])
  .filter((owner) => owner.archived !== true)
  .map((owner) => ({ id: owner.id, name: [owner.firstName, owner.lastName].filter(Boolean).join(" "), email: owner.email }));
console.log(JSON.stringify(owners, null, 2));
