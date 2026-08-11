#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "data/hubspot-manifest.json"), "utf8"));
const apply = process.argv.includes("--apply");
const token = process.env.HUBSPOT_ACCESS_TOKEN;
if (apply && !token) throw new Error("HUBSPOT_ACCESS_TOKEN is required with --apply.");

function propertyPayload(property) {
  const options = property.type === "bool"
    ? [
        { label: "Yes", value: "true", displayOrder: 1, hidden: false },
        { label: "No", value: "false", displayOrder: 2, hidden: false }
      ]
    : property.options?.map((value, index) => ({ label: value.replaceAll("_", " "), value, displayOrder: index + 1, hidden: false })) || [];
  return {
    ...property,
    options
  };
}

async function request(pathname, options = {}) {
  const response = await fetch(`https://api.hubapi.com${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

console.log(`HubSpot manifest ${manifest.version}`);
console.log(`Contact properties: ${manifest.contactProperties.length}`);
console.log(`Deal properties: ${manifest.dealProperties.length}`);

if (!apply) {
  console.log("Dry run only. Set HUBSPOT_ACCESS_TOKEN and rerun with --apply to create missing properties and inspect deal pipelines.");
  process.exit(0);
}

for (const [objectType, properties] of [["contacts", manifest.contactProperties], ["deals", manifest.dealProperties]]) {
  for (const property of properties) {
    const existing = await request(`/crm/properties/${manifest.apiVersion}/${objectType}/${property.name}`);
    if (existing.response.ok) {
      console.log(`exists ${objectType}.${property.name}`);
      continue;
    }
    if (existing.response.status !== 404) throw new Error(`Could not inspect ${objectType}.${property.name}: ${existing.response.status} ${JSON.stringify(existing.body)}`);
    const created = await request(`/crm/properties/${manifest.apiVersion}/${objectType}`, {
      method: "POST",
      body: JSON.stringify(propertyPayload(property))
    });
    if (!created.response.ok) throw new Error(`Could not create ${objectType}.${property.name}: ${created.response.status} ${JSON.stringify(created.body)}`);
    console.log(`created ${objectType}.${property.name}`);
  }
}

const pipelines = await request(`/crm/pipelines/${manifest.apiVersion}/deals`);
if (!pipelines.response.ok) throw new Error(`Could not list deal pipelines: ${pipelines.response.status} ${JSON.stringify(pipelines.body)}`);
console.log("\nAvailable deal pipeline mappings:");
for (const pipeline of pipelines.body.results || []) {
  console.log(`HUBSPOT_PIPELINE_ID=${pipeline.id} # ${pipeline.label}`);
  for (const stage of pipeline.stages || []) console.log(`  ${stage.label}: ${stage.id}`);
}
console.log("\nChoose the pipeline and Qualified stage, then set HUBSPOT_PIPELINE_ID and HUBSPOT_STAGE_QUALIFIED in Vercel.");
