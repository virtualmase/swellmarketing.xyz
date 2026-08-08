#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(await readFile(path.join(root, "data/hubspot-test-fixtures.json"), "utf8"));
const apply = process.argv.includes("--apply");
const token = process.env.HUBSPOT_ACCESS_TOKEN;

console.log("Synthetic HubSpot fixtures selected for archival:");
for (const [type, ids] of Object.entries(fixtures)) console.log(`${type}: ${ids.length} (${ids.join(", ")})`);

if (!apply) {
  console.log("Dry run only. Review the IDs, then rerun with --apply to archive exactly these records.");
  process.exit(0);
}
if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is required in the current shell.");

const objectType = { contacts: "contacts", companies: "companies", deals: "deals", notes: "notes" };
for (const [type, ids] of Object.entries(fixtures)) {
  for (const id of ids) {
    const response = await fetch(`https://api.hubapi.com/crm/objects/2026-03/${objectType[type]}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 204 || response.status === 404) console.log(`archived ${type}.${id}`);
    else throw new Error(`Could not archive ${type}.${id}: ${response.status} ${(await response.text()).slice(0, 1000)}`);
  }
}

console.log("Synthetic HubSpot fixture cleanup complete. Archived records remain recoverable from HubSpot's recycle bin according to the portal's retention policy.");
