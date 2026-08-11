#!/usr/bin/env node

const token = process.env.HUBSPOT_ACCESS_TOKEN;
const contactId = process.argv[2];
if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is required in the current shell.");
if (!/^\d+$/.test(contactId || "")) throw new Error("Pass a numeric HubSpot contact ID.");

for (const version of ["2026-03", "v3"]) {
  const url = `https://api.hubapi.com/crm/objects/${version}/contacts/${contactId}?properties=email&associations=companies`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  console.log(JSON.stringify({
    version,
    status: response.status,
    topLevelKeys: Object.keys(body || {}),
    associationKeys: Object.keys(body?.associations || {}),
    companyAssociations: body?.associations?.companies?.results || null,
    errorCategory: body?.category || null,
    errorMessage: body?.message || null
  }, null, 2));
}
