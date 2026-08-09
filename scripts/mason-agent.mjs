#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOfflineBrief, runMasonAgent } from "../lib/mason-agent.js";
import { readAgentRuns, recordAgentRun, recordDraftArtifact, writeMissionCaseStudy } from "../lib/mason-case-study.js";
import { getGtmSnapshot } from "../lib/gtm-report.js";
import { applyMissionEvidence } from "../lib/mission-evidence.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
};

if (has("--help")) {
  console.log(`Mason Nguyen — SWELL GTM operating agent

Usage:
  node scripts/mason-agent.mjs --offline --snapshot data/mason-agent-snapshot.example.json
  OPENAI_API_KEY=... HUBSPOT_ACCESS_TOKEN=... node scripts/mason-agent.mjs

Options:
  --offline          Use deterministic decision rules; no OpenAI request.
  --strict-ai        Fail instead of using deterministic fallback when OpenAI is unavailable.
  --snapshot <path>  Read an aggregated snapshot instead of HubSpot.
  --context <text>   Add a specific operating request.
  --output <path>    Save the JSON brief to a file.
  --no-record        Do not add this run to the private experiment record.
  --date <ISO date>  Override the review time for replayable tests.
  --help             Show this help.

Runs are recorded under .swell-agent/runs by default. The final sanitized case
study is generated automatically once every mission-completion gate is verified.`);
  process.exit(0);
}

const readJson = async (relativeOrAbsolute) => JSON.parse(await readFile(path.resolve(root, relativeOrAbsolute), "utf8"));
const agent = await readJson("data/mason-agent.json");
const operatingModel = await readJson("data/gtm-operating-model.json");
const now = value("--date") ? new Date(value("--date")) : new Date();
if (Number.isNaN(now.getTime())) throw new Error("--date must be a valid ISO date.");

const snapshotPath = value("--snapshot");
const snapshotDocument = snapshotPath ? await readJson(snapshotPath) : null;
const baseSnapshot = snapshotDocument
  ? snapshotDocument.scope === "aggregate_only" && snapshotDocument.snapshot ? snapshotDocument.snapshot : snapshotDocument
  : await getGtmSnapshot({ now });
const missionLedger = await readJson("data/mission-activity-ledger.json");
const experimentRegistry = await readJson("data/mission-experiments.json");
const snapshot = applyMissionEvidence(baseSnapshot, missionLedger, experimentRegistry);
const context = value("--context") || "Run the daily SWELL operating review.";
let brief;
if (has("--offline")) {
  brief = buildOfflineBrief({ agent, snapshot, now });
  brief.executionMode = "deterministic_offline";
} else {
  try {
    brief = await runMasonAgent({ agent, operatingModel, snapshot, context });
    brief.executionMode = "openai_responses";
  } catch (error) {
    if (has("--strict-ai")) throw error;
    console.error(`OpenAI unavailable; continuing with deterministic fallback: ${error.message}`);
    brief = buildOfflineBrief({ agent, snapshot, now });
    brief.executionMode = "deterministic_fallback";
    brief.risks.unshift("OpenAI reasoning was unavailable for this run; deterministic SWELL decision rules were used.");
  }
}

if (!has("--no-record")) {
  const artifactPath = await recordDraftArtifact({ root, brief });
  const artifactAction = brief.priorityActions.find((action) => action.executionStatus === "ready" && /draft|prepare/i.test(action.title));
  if (artifactAction) artifactAction.executionStatus = "executed";
  brief.execution = { artifactsCreated: [artifactPath], externalActionsExecuted: [] };
  console.error(`Created autonomous SWELL artifact at ${artifactPath}`);
  const runPath = await recordAgentRun({ root, agent, snapshot, brief, context });
  console.error(`Recorded SWELL experiment run at ${runPath}`);
  if (brief.mission?.complete === true) {
    const caseStudyPath = await writeMissionCaseStudy({ root, agent, runs: await readAgentRuns(root), experimentRegistry });
    console.error(`Generated mission-complete case study at ${caseStudyPath}`);
  }
}

const serialized = `${JSON.stringify(brief, null, 2)}\n`;
const outputPath = value("--output");
if (outputPath) {
  const resolved = path.resolve(root, outputPath);
  await writeFile(resolved, serialized, { encoding: "utf8", mode: 0o600 });
  console.error(`Saved SWELL operating brief to ${resolved}`);
}
process.stdout.write(serialized);
