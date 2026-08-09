#!/usr/bin/env node

import { buildSonarRequest, flattenBaselineQueries, PERPLEXITY_SONAR_URL, runPerplexityBaseline } from "../lib/perplexity-baseline.js";

const issues = [];
const fail = (condition, message) => { if (!condition) issues.push(message); };
const manifest = {
  runId: "baseline_test",
  experimentId: "experiment_test",
  conditions: { locale: "en-US" },
  accounts: [{
    company: "Example",
    canonicalDomain: "example.com",
    changeEvidenceUrl: "https://example.com/change",
    queries: [
      { queryId: "01_01", query: "What is Example?" },
      { queryId: "01_02", query: "Did Example change?" }
    ]
  }]
};

const flattened = flattenBaselineQueries(manifest);
fail(flattened.length === 2 && flattened[0].query === "What is Example?", "Manifest queries were not flattened canonically");
const request = buildSonarRequest("What is Example?");
fail(request.messages.length === 1 && request.messages[0].content === "What is Example?", "Sonar request mutated the canonical query");
fail(request.stream === false && request.temperature === 0, "Sonar request is not deterministic and non-streaming");

const requests = [];
let tick = 0;
const run = await runPerplexityBaseline({
  manifest,
  apiKey: "test-key-never-recorded",
  maxQueries: 2,
  maxCostUsd: 0.75,
  now: () => `2026-08-09T21:2${tick++}:00.000Z`,
  fetchImpl: async (url, options) => {
    requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: "sonar-pro",
          choices: [{ message: { content: `Answer ${requests.length}` } }],
          citations: ["https://example.com/change"],
          usage: { cost: { total_cost: 0.01 } }
        };
      }
    };
  }
});

fail(requests.length === 2, "Controlled run did not execute one request per query");
fail(requests.every((item) => item.url === PERPLEXITY_SONAR_URL), "Controlled run used an unapproved endpoint");
fail(requests[0].body.messages[0].content === "What is Example?" && requests[1].body.messages[0].content === "Did Example change?", "Controlled run changed query order or text");
fail(run.status === "completed_pending_review" && run.observations.length === 2, "Controlled run did not preserve completed observations");
fail(run.surface.isConsumerProSurface === false, "Sonar API run was mislabeled as a consumer Pro observation");
fail(!JSON.stringify(run).includes("test-key-never-recorded"), "Credential leaked into the run artifact");
fail(run.observations.every((item) => item.materialMismatch === null), "Adapter inferred an evidence verdict before review");

let costCalls = 0;
const capped = await runPerplexityBaseline({
  manifest,
  apiKey: "test-key",
  maxQueries: 2,
  maxCostUsd: 0.005,
  fetchImpl: async () => {
    costCalls += 1;
    return { ok: true, status: 200, async json() { return { model: "sonar-pro", choices: [{ message: { content: "Answer" } }], usage: { cost: { total_cost: 0.01 } } }; } };
  }
});
fail(costCalls === 1 && capped.status === "cost_limit_reached", "Observed-cost ceiling did not stop subsequent requests");

if (issues.length) {
  console.error(`Perplexity baseline check failed:\n- ${issues.join("\n- ")}`);
  process.exit(1);
}
console.log("Perplexity baseline check passed: canonical queries, fixed endpoint, private credential boundary, checkpoint artifact, and spend ceiling verified.");
