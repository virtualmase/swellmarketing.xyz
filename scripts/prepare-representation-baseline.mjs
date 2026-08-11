#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(await readFile(path.join(root, "data/representation-gap-target-accounts.json"), "utf8"));
const runDate = process.argv.includes("--date") ? process.argv[process.argv.indexOf("--date") + 1] : new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) throw new Error("--date must use YYYY-MM-DD.");

const manifest = {
  version: "1.0.0",
  runId: `representation_gap_baseline_${runDate.replaceAll("-", "")}_01`,
  experimentId: source.experimentId,
  status: "prepared",
  preparedAt: new Date(`${runDate}T16:00:00.000Z`).toISOString(),
  purpose: "Observe whether selected AI answer surfaces accurately represent documented recent company, product, and category changes. Inclusion in this manifest does not imply an inaccurate answer.",
  conditions: {
    locale: "en-US",
    language: "English",
    sessionState: "new session for each account and surface",
    queryOrder: "canonical order shown per account",
    captureRequired: ["surface", "model_or_product_label", "observed_at", "query", "answer", "citations", "material_mismatch", "reviewer_notes"]
  },
  surfaces: [
    { id: "openai_api", status: "blocked", blocker: "Configured organization has no remaining API credits." },
    { id: "google_ai_search", status: "not_configured", blocker: "No reproducible observation adapter is configured." },
    { id: "perplexity", status: "not_configured", blocker: "No reproducible observation adapter is configured." }
  ],
  accounts: source.accounts.map((account) => ({
    priority: account.priority,
    company: account.company,
    canonicalDomain: account.domain,
    changeEvidenceUrl: account.evidenceUrl,
    representationStatus: "unobserved",
    queries: account.representationQuestions.map((query, index) => ({
      queryId: `${String(account.priority).padStart(2, "0")}_${String(index + 1).padStart(2, "0")}`,
      query,
      observations: []
    }))
  }))
};

const destination = path.join(root, "data/representation-gap-baseline-run.json");
await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(destination);
