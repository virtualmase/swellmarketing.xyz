#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { flattenBaselineQueries, PERPLEXITY_BASELINE_MODELS, runPerplexityBaseline } from "../lib/perplexity-baseline.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};
const resolveFromRoot = (input) => path.resolve(root, input);
const readJson = async (input) => JSON.parse(await readFile(resolveFromRoot(input), "utf8"));
const readJsonIfPresent = async (input) => {
  try { return await readJson(input); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const atomicJsonWrite = async (input, data) => {
  const destination = resolveFromRoot(input);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, destination);
};

if (has("--help")) {
  console.log(`Run SWELL's controlled Perplexity Sonar baseline

Usage:
  node scripts/run-perplexity-baseline.mjs --dry-run
  PERPLEXITY_API_KEY=... node scripts/run-perplexity-baseline.mjs

Options:
  --dry-run                 Validate and print the execution plan without API calls.
  --model <sonar|sonar-pro> Model label; defaults to sonar-pro.
  --max-queries <1..30>     Maximum new requests in this invocation; defaults to 30.
  --max-cost-usd <amount>   Observed-cost ceiling; defaults to 0.75 and is capped at 5.
  --manifest <path>         Private baseline manifest path.
  --output <path>           Private checkpointed observation path.

Set the credential through PERPLEXITY_API_KEY or PERPLEXITY_API_KEY_FILE. The
script never accepts a key on the command line and never prints it.`);
  process.exit(0);
}

const manifestPath = value("--manifest", "data/representation-gap-baseline-run.json");
const outputPath = value("--output", "data/representation-gap-perplexity-run.json");
const model = value("--model", "sonar-pro");
const maxQueries = Number(value("--max-queries", "30"));
const maxCostUsd = Number(value("--max-cost-usd", "0.75"));
if (!PERPLEXITY_BASELINE_MODELS.has(model)) throw new Error("--model must be sonar or sonar-pro.");

const manifest = await readJson(manifestPath);
const plannedQueries = flattenBaselineQueries(manifest);
if (plannedQueries.length !== 30) throw new Error(`Expected 30 canonical queries, found ${plannedQueries.length}.`);

if (has("--dry-run")) {
  process.stdout.write(`${JSON.stringify({
    mode: "dry_run",
    provider: "Perplexity",
    surface: "Sonar API",
    consumerProSurface: false,
    endpoint: "https://api.perplexity.ai/v1/sonar",
    model,
    plannedQueries: plannedQueries.length,
    maxQueries,
    maxCostUsd,
    outputPath
  }, null, 2)}\n`);
  process.exit(0);
}

let apiKey = process.env.PERPLEXITY_API_KEY?.trim();
if (!apiKey && process.env.PERPLEXITY_API_KEY_FILE) {
  apiKey = (await readFile(path.resolve(process.env.PERPLEXITY_API_KEY_FILE), "utf8")).trim();
}
if (!apiKey) throw new Error("Set PERPLEXITY_API_KEY or PERPLEXITY_API_KEY_FILE in secure local secret storage.");

const existingRun = await readJsonIfPresent(outputPath);
const run = await runPerplexityBaseline({
  manifest,
  apiKey,
  existingRun,
  model,
  maxQueries,
  maxCostUsd,
  onCheckpoint: (checkpoint) => atomicJsonWrite(outputPath, checkpoint)
});

const surface = manifest.surfaces.find((item) => item.id === "perplexity");
if (surface) {
  surface.status = run.status;
  surface.modelOrProductLabel = `${run.surface.product} / ${run.surface.model}`;
  surface.queryCount = run.summary.completedQueries;
  surface.artifactRef = outputPath;
  surface.limitation = "Sonar API observation; this is not a capture of the Perplexity consumer Pro web application.";
  delete surface.blocker;
  await atomicJsonWrite(manifestPath, manifest);
}

process.stdout.write(`${JSON.stringify({
  status: run.status,
  model: run.surface.model,
  completedQueries: run.summary.completedQueries,
  plannedQueries: run.summary.plannedQueries,
  observedCostUsd: run.summary.observedCostUsd,
  outputPath
}, null, 2)}\n`);
