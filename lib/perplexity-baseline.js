export const PERPLEXITY_SONAR_URL = "https://api.perplexity.ai/v1/sonar";
export const PERPLEXITY_BASELINE_MODELS = new Set(["sonar", "sonar-pro"]);

export function flattenBaselineQueries(manifest) {
  const queries = [];
  for (const account of manifest?.accounts || []) {
    for (const item of account.queries || []) {
      queries.push({
        queryId: item.queryId,
        company: account.company,
        canonicalDomain: account.canonicalDomain,
        changeEvidenceUrl: account.changeEvidenceUrl,
        query: item.query
      });
    }
  }
  return queries;
}

export function buildSonarRequest(query, { model = "sonar-pro", maxTokens = 700 } = {}) {
  if (!PERPLEXITY_BASELINE_MODELS.has(model)) throw new Error(`Unsupported controlled-baseline model: ${model}`);
  if (!query || typeof query !== "string") throw new Error("A canonical query is required.");
  return {
    model,
    messages: [{ role: "user", content: query }],
    max_tokens: maxTokens,
    stream: false,
    temperature: 0
  };
}

function responseCost(response) {
  const value = Number(response?.usage?.cost?.total_cost);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function initialRun(manifest, { model, maxCostUsd, startedAt }) {
  return {
    version: "1.0.0",
    runId: `${manifest.runId}_perplexity_sonar`,
    baselineRunId: manifest.runId,
    experimentId: manifest.experimentId,
    status: "running",
    startedAt,
    completedAt: null,
    surface: {
      id: "perplexity_sonar_api",
      class: "ai_answer_api",
      provider: "Perplexity",
      product: "Sonar API",
      model,
      endpoint: PERPLEXITY_SONAR_URL,
      isConsumerProSurface: false
    },
    conditions: {
      ...(manifest.conditions || {}),
      sessionState: "one stateless API request per canonical query",
      queryMutation: "none",
      temperature: 0,
      maxTokens: 700,
      maxCostUsd
    },
    summary: {
      plannedQueries: flattenBaselineQueries(manifest).length,
      completedQueries: 0,
      observedCostUsd: 0
    },
    observations: []
  };
}

export async function runPerplexityBaseline({
  manifest,
  apiKey,
  existingRun = null,
  fetchImpl = globalThis.fetch,
  model = "sonar-pro",
  maxQueries = 30,
  maxCostUsd = 0.75,
  now = () => new Date().toISOString(),
  onCheckpoint = async () => {}
}) {
  if (!apiKey?.trim()) throw new Error("PERPLEXITY_API_KEY is required for a live baseline run.");
  if (!PERPLEXITY_BASELINE_MODELS.has(model)) throw new Error(`Unsupported controlled-baseline model: ${model}`);
  if (!Number.isInteger(maxQueries) || maxQueries < 1 || maxQueries > 30) throw new Error("maxQueries must be an integer from 1 to 30.");
  if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0 || maxCostUsd > 5) throw new Error("maxCostUsd must be greater than 0 and no more than 5.");

  const planned = flattenBaselineQueries(manifest);
  const run = existingRun || initialRun(manifest, { model, maxCostUsd, startedAt: now() });
  if (run.baselineRunId !== manifest.runId) throw new Error("Existing run does not match the baseline manifest.");
  if (run.surface?.model !== model) throw new Error("Existing run model does not match the requested model.");

  const completedIds = new Set((run.observations || []).map((item) => item.queryId));
  let observedCost = (run.observations || []).reduce((sum, item) => sum + responseCost(item), 0);
  let attemptedThisInvocation = 0;

  for (const item of planned) {
    if (completedIds.has(item.queryId) || attemptedThisInvocation >= maxQueries) continue;
    if (observedCost >= maxCostUsd) {
      run.status = "cost_limit_reached";
      break;
    }

    const request = buildSonarRequest(item.query, { model });
    const response = await fetchImpl(PERPLEXITY_SONAR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60_000)
    });
    attemptedThisInvocation += 1;
    if (!response.ok) throw new Error(`Perplexity Sonar request failed with HTTP ${response.status}.`);
    const payload = await response.json();
    const answer = payload?.choices?.[0]?.message?.content;
    if (!answer || typeof answer !== "string") throw new Error(`Perplexity Sonar returned no answer for ${item.queryId}.`);

    const observation = {
      queryId: item.queryId,
      company: item.company,
      canonicalDomain: item.canonicalDomain,
      changeEvidenceUrl: item.changeEvidenceUrl,
      requestedQuery: item.query,
      executedQuery: request.messages[0].content,
      execution: "exact",
      observedAt: now(),
      surface: "perplexity_sonar_api",
      modelOrProductLabel: payload.model || model,
      answer,
      citations: Array.isArray(payload.citations) ? payload.citations : [],
      searchResults: Array.isArray(payload.search_results) ? payload.search_results : [],
      usage: payload.usage || null,
      materialMismatch: null,
      reviewerNotes: "Pending comparison with the dated first-party change evidence."
    };
    run.observations.push(observation);
    completedIds.add(item.queryId);
    observedCost += responseCost(observation);
    run.summary.completedQueries = run.observations.length;
    run.summary.observedCostUsd = Number(observedCost.toFixed(6));
    await onCheckpoint(run);
  }

  if (run.observations.length === planned.length) {
    run.status = "completed_pending_review";
    run.completedAt = now();
  } else if (run.status !== "cost_limit_reached") {
    run.status = "partial";
  }
  run.summary.completedQueries = run.observations.length;
  run.summary.observedCostUsd = Number(observedCost.toFixed(6));
  await onCheckpoint(run);
  return run;
}
