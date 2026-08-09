#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const baseline = await readJson("data/representation-gap-baseline-run.json");
const control = await readJson("data/representation-gap-public-search-control.json");
const vercelIgnore = await readFile(path.join(root, ".vercelignore"), "utf8");
const errors = [];
const fail = (condition, message) => { if (!condition) errors.push(message); };

const expectedQueries = new Map();
for (const account of baseline.accounts || []) {
  for (const query of account.queries || []) {
    fail(!expectedQueries.has(query.queryId), `Duplicate baseline query id: ${query.queryId}`);
    expectedQueries.set(query.queryId, { company: account.company, query: query.query });
  }
}

const observations = control.observations || [];
const ids = new Set();
for (const observation of observations) {
  const expected = expectedQueries.get(observation.queryId);
  fail(Boolean(expected), `Unexpected control query id: ${observation.queryId}`);
  fail(!ids.has(observation.queryId), `Duplicate control query id: ${observation.queryId}`);
  ids.add(observation.queryId);
  if (!expected) continue;
  fail(observation.company === expected.company, `Company mismatch for ${observation.queryId}`);
  fail(observation.requestedQuery === expected.query, `Requested-query mismatch for ${observation.queryId}`);
  fail(["exact", "disambiguated"].includes(observation.execution), `Invalid execution type for ${observation.queryId}`);
  fail(["aligned", "mixed", "partial", "legacy_heavy"].includes(observation.assessment), `Invalid assessment for ${observation.queryId}`);
  fail(Boolean(observation.observation), `Missing observation for ${observation.queryId}`);
  fail(Array.isArray(observation.firstPartySources), `Missing first-party sources array for ${observation.queryId}`);
  for (const source of observation.firstPartySources || []) {
    try { fail(new URL(source).protocol === "https:", `Non-HTTPS source for ${observation.queryId}`); }
    catch { errors.push(`Invalid source URL for ${observation.queryId}`); }
  }
}

const assessmentCounts = observations.reduce((counts, item) => {
  counts[item.assessment] = (counts[item.assessment] || 0) + 1;
  return counts;
}, {});
const exact = observations.filter((item) => item.execution === "exact").length;
const disambiguated = observations.filter((item) => item.execution === "disambiguated").length;
const withFirstParty = observations.filter((item) => item.firstPartySources?.length > 0).length;
const controlSurface = (baseline.surfaces || []).find((surface) => surface.id === control.surface?.id);

fail(control.status === "completed", "Control status must be completed.");
fail(control.surface?.class === "public_search_control", "Surface must be labeled as a public-search control.");
fail(control.surface?.isAiAnswerSurface === false, "Control must explicitly deny AI-answer-surface status.");
fail(control.baselineRunId === baseline.runId, "Control must reference the prepared baseline run.");
fail(observations.length === expectedQueries.size, `Expected ${expectedQueries.size} observations, found ${observations.length}.`);
fail(ids.size === expectedQueries.size, "Every baseline query must have exactly one control observation.");
fail(control.summary?.queries === observations.length, "Summary query count mismatch.");
fail(control.summary?.exactQueryExecutions === exact, "Summary exact-query count mismatch.");
fail(control.summary?.disambiguatedQueryExecutions === disambiguated, "Summary disambiguated-query count mismatch.");
fail(control.summary?.queriesWithCurrentFirstPartySource === withFirstParty, "Summary first-party-source count mismatch.");
for (const [assessment, count] of Object.entries(control.summary?.assessments || {})) {
  fail(assessmentCounts[assessment] === count, `Summary assessment count mismatch for ${assessment}.`);
}
fail(Boolean(controlSurface), "Baseline manifest is missing the control surface.");
fail(controlSurface?.status === "completed", "Baseline control surface must be completed.");
fail(controlSurface?.artifactRef === "data/representation-gap-public-search-control.json", "Baseline control artifact reference mismatch.");
fail(/not an observation of any AI answer surface/i.test(controlSurface?.limitation || ""), "Baseline control limitation is missing.");
for (const privatePath of [
  "data/mission-activity-ledger.json",
  "data/mission-experiments.json",
  "data/representation-gap-baseline-run.json",
  "data/representation-gap-public-search-control.json",
  "data/representation-gap-target-accounts.json"
]) {
  fail(vercelIgnore.split(/\r?\n/).includes(privatePath), `${privatePath} is not excluded from Vercel deployment.`);
}

if (errors.length) {
  console.error(`Representation control check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Representation control check passed: ${observations.length} queries, ${withFirstParty} with current first-party sources, ${disambiguated} disambiguated, and no AI-answer-surface claim.`);
