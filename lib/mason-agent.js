const RESPONSES_URL = "https://api.openai.com/v1/responses";

export const MASON_BRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    disclosure: { type: "string" },
    generatedAt: { type: "string" },
    executiveSummary: { type: "string" },
    currentConstraint: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
        decision: { type: "string" }
      },
      required: ["name", "evidence", "decision"]
    },
    progress: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          metric: { type: "string" },
          current: { type: ["number", "null"] },
          target: { type: "number" },
          status: { type: "string", enum: ["unknown", "behind", "on_track", "achieved", "violated"] }
        },
        required: ["metric", "current", "target", "status"]
      }
    },
    priorityActions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          outcome: { type: "string" },
          metric: { type: "string" },
          owner: { type: "string" },
          dueAt: { type: "string" },
          executionStatus: { type: "string", enum: ["ready", "executed", "blocked"] },
          blocker: { type: ["string", "null"] }
        },
        required: ["title", "outcome", "metric", "owner", "dueAt", "executionStatus", "blocker"]
      }
    },
    draft: {
      type: "object",
      additionalProperties: false,
      properties: {
        assetType: { type: "string" },
        audience: { type: "string" },
        workingTitle: { type: "string" },
        thesis: { type: "string" },
        callToAction: { type: "string" },
        body: { type: "string" },
        evidenceNeeded: { type: "array", items: { type: "string" } }
      },
      required: ["assetType", "audience", "workingTitle", "thesis", "callToAction", "body", "evidenceNeeded"]
    },
    learning: {
      type: "object",
      additionalProperties: false,
      properties: {
        hypothesis: { type: "string" },
        observation: { type: "string" },
        result: { type: "string", enum: ["pending", "supported", "rejected", "inconclusive"] },
        decision: { type: "string" },
        evidence: { type: "array", items: { type: "string" } }
      },
      required: ["hypothesis", "observation", "result", "decision", "evidence"]
    },
    mission: {
      type: "object",
      additionalProperties: false,
      properties: {
        complete: { type: "boolean" },
        reason: { type: "string" },
        missingEvidence: { type: "array", items: { type: "string" } }
      },
      required: ["complete", "reason", "missingEvidence"]
    },
    risks: { type: "array", items: { type: "string" } }
  },
  required: ["disclosure", "generatedAt", "executiveSummary", "currentConstraint", "progress", "priorityActions", "draft", "learning", "mission", "risks"]
};

const METRICS = [
  ["Connected buyer conversations", "connectedBuyerConversations", (snapshot) => snapshot.contacts?.connected],
  ["Qualified opportunities", "qualifiedOpportunities", (snapshot) => snapshot.pipeline?.swellTotalDeals],
  ["Completed discovery calls", "completedDiscoveryCalls", (snapshot) => snapshot.activity?.completedDiscoveryCalls],
  ["Proposals issued", "proposalsIssued", (snapshot) => snapshot.activity?.proposalsIssued],
  ["Qualified pipeline (USD)", "qualifiedPipelineUsd", (snapshot) => snapshot.pipeline?.openAmount],
  ["Closed-won engagements", "closedWonEngagements", (snapshot) => snapshot.pipeline?.closedWonCount],
  ["Closed-won revenue (USD)", "closedWonRevenueUsd", (snapshot) => snapshot.pipeline?.closedWonRevenue],
  ["First-response SLA (%)", "firstResponseSlaPercent", (snapshot) => snapshot.activity?.firstResponseSlaPercent],
  ["Required-field completion (%)", "requiredFieldCompletionPercent", (snapshot) => snapshot.activity?.requiredFieldCompletionPercent],
  ["Consent or unsupported-claim violations", "consentOrUnsupportedClaimViolations", (snapshot) => snapshot.activity?.consentOrUnsupportedClaimViolations]
];

function isoDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

function progressStatus(metricKey, current, target, elapsedRatio) {
  if (current === undefined || current === null || !Number.isFinite(Number(current))) return "unknown";
  const value = Number(current);
  if (metricKey === "consentOrUnsupportedClaimViolations") return value > target ? "violated" : "on_track";
  if (value >= target) return "achieved";
  return value / target + 0.08 >= elapsedRatio ? "on_track" : "behind";
}

export function calculateProgress(agent, snapshot, now = new Date()) {
  const start = new Date(`${agent.objective.startsAt}T00:00:00.000Z`);
  const end = new Date(`${agent.objective.endsAt}T23:59:59.999Z`);
  const currentTime = new Date(now).getTime();
  const elapsedRatio = Math.max(0, Math.min(1, (currentTime - start.getTime()) / (end.getTime() - start.getTime())));
  return METRICS.map(([metric, key, read]) => {
    const raw = read(snapshot);
    const current = raw === undefined || raw === null ? null : Number(raw);
    const target = Number(agent.objective.targets[key]);
    return { metric, key, current, target, status: progressStatus(key, current, target, elapsedRatio) };
  });
}

function determineConstraint(agent, snapshot, progress) {
  const violations = progress.find((metric) => metric.key === "consentOrUnsupportedClaimViolations")?.current || 0;
  if (violations > 0) return {
    id: "governance",
    name: "Governance violation",
    evidence: [`${violations} consent or unsupported-claim violation(s) require resolution.`],
    decision: "Stop outbound activity, resolve the violation, document the cause, and verify the control before resuming."
  };
  const operationalFailures = (snapshot.tasks?.overdue || 0) + (snapshot.pipeline?.overdueNextActions || 0) + (snapshot.pipeline?.openWithoutNextAction || 0) + (snapshot.tasks?.ownerlessOpen || 0);
  if (operationalFailures > 0) return {
    id: "pipeline_hygiene",
    name: "Pipeline follow-through",
    evidence: [
      `${snapshot.tasks?.overdue || 0} overdue task(s).`,
      `${snapshot.pipeline?.overdueNextActions || 0} overdue deal next action(s).`,
      `${snapshot.pipeline?.openWithoutNextAction || 0} open deal(s) without a next action.`
    ],
    decision: "Restore ownership and next-action discipline before adding demand."
  };
  const connected = progress.find((metric) => metric.key === "connectedBuyerConversations");
  const qualified = progress.find((metric) => metric.key === "qualifiedOpportunities");
  const pipeline = progress.find((metric) => metric.key === "qualifiedPipelineUsd");
  const won = progress.find((metric) => metric.key === "closedWonEngagements");
  if (connected?.status === "unknown") return {
    id: "measurement",
    name: "Incomplete activity measurement",
    evidence: ["Connected-conversation progress is not available in the supplied CRM snapshot."],
    decision: "Instrument connected conversations, discoveries, proposals, SLA, and field completeness before interpreting conversion performance."
  };
  if (connected.current < connected.target && (qualified?.current || 0) === 0) return {
    id: "qualified_conversations",
    name: "Qualified conversation creation",
    evidence: [`${connected.current} of ${connected.target} connected buyer conversations recorded.`, "No qualified opportunity is recorded yet."],
    decision: "Run the Representation Gap campaign against the defined B2B segment and optimize for specific problem-led replies."
  };
  if ((qualified?.current || 0) < qualified.target) return {
    id: "qualification",
    name: "Conversation-to-qualified conversion",
    evidence: [`${qualified.current} of ${qualified.target} qualified opportunities recorded.`],
    decision: "Review buyer language and qualification evidence, then improve the segment, message, or discovery path."
  };
  if ((pipeline?.current || 0) < pipeline.target) return {
    id: "pipeline_value",
    name: "Qualified pipeline value",
    evidence: [`$${pipeline.current || 0} of $${pipeline.target} qualified pipeline recorded.`],
    decision: "Advance qualified buyers to a scoped Representation Baseline proposal with a dated next action."
  };
  if ((won?.current || 0) < won.target) return {
    id: "close_plan",
    name: "First paid engagement",
    evidence: ["Pipeline target is present, but the first verified closed-won engagement is not recorded."],
    decision: "Create a human-owned close plan for the best-fit opportunity without changing price or promising outcomes."
  };
  return {
    id: "delivery_and_learning",
    name: "Delivery and repeatability",
    evidence: ["The primary 90-day commercial targets are achieved."],
    decision: "Complete the client handoff, capture win evidence, and decide the next operating constraint."
  };
}

function offlineActions(constraint, now, snapshot) {
  const owner = "Mason Nguyen (AI GTM operating agent)";
  const actions = {
    governance: [
      ["Resolve the governance exception", "Document and eliminate every active consent or unsupported-claim violation.", "0 unresolved governance violations", 1, true],
      ["Audit affected records and drafts", "Identify every record or artifact touched by the failure and prepare corrections.", "100% affected items reviewed", 2, true]
    ],
    pipeline_hygiene: [
      ["Clear overdue response work", "Review each overdue task and either complete it or assign a truthful next action.", "0 overdue SWELL tasks", 1, true],
      ["Repair deal next actions", "Give every open opportunity an owner, action, and date.", "0 open deals without a next action", 1, true]
    ],
    measurement: [
      ["Complete activity instrumentation", "Record connected conversations, completed discoveries, proposals, SLA, and required-field completeness.", "5 activity KPIs report a verified value", 3, true],
      ["Establish the campaign baseline", "Save the pre-launch scorecard and document known data limitations.", "1 reconciled baseline scorecard", 4, true]
    ],
    qualified_conversations: [
      ["Draft the first buyer observation", "Create a problem-led artifact about outdated AI product descriptions for evidence-rich B2B companies.", "1 publication-ready buyer-observation draft", 2],
      ["Build a contextual prospect set", "Identify companies matching the segment and record the observable trigger and permitted contact basis.", "10 evidence-backed target accounts", 4, true],
      ["Prepare a distribution pass", "Draft individualized, consent-safe distribution copy tied to the Representation Gap diagnostic.", "10 send-ready permitted messages", 5]
    ],
    qualification: [
      ["Review conversation evidence", "Score each connected conversation against the seven documented qualification dimensions.", "100% connected conversations scored", 2, true],
      ["Improve the discovery path", "Draft the next discovery agenda around problem, consequence, authority, evidence access, timing, investment, and method fit.", "1 execution-ready discovery brief", 3]
    ],
    pipeline_value: [
      ["Prepare the next baseline proposal", "Turn verified discovery evidence into a scoped, versioned Representation Baseline proposal using configured terms.", "1 execution-ready proposal", 2],
      ["Date every commercial next action", "Create an evidence-led follow-up plan for every qualified opportunity.", "100% qualified deals have a dated next action", 1]
    ],
    close_plan: [
      ["Prepare the first-engagement close plan", "Document buyer decision steps, open evidence questions, commercial owner, and next action.", "1 evidence-complete close plan", 1],
      ["Draft the decision follow-up", "Prepare a concise, evidence-led follow-up without discounts or outcome promises.", "1 send-ready permitted follow-up", 1]
    ],
    delivery_and_learning: [
      ["Complete the client handoff", "Transfer verified scope, evidence, owners, exclusions, and kickoff timing.", "1 complete client handoff", 1, true],
      ["Capture the win pattern", "Document the trigger, buyer language, decision path, and source-to-revenue evidence.", "1 completed win review", 4, true]
    ]
  };
  if (constraint.id === "qualified_conversations" && snapshot.evidenceCoverage?.campaignAssetsCreated > 0) {
    actions.qualified_conversations.shift();
    actions.qualified_conversations.unshift([
      "Prepare the versioned answer baseline",
      "Turn the ten account-level representation questions into a controlled observation run with explicit surfaces and conditions.",
      "1 executable 30-query baseline manifest",
      1
    ]);
  }
  if (constraint.id === "qualified_conversations" && snapshot.evidenceCoverage?.targetAccountsResearched >= 10) {
    actions.qualified_conversations = actions.qualified_conversations.filter(([title]) => title !== "Build a contextual prospect set");
  }
  if (constraint.id === "qualified_conversations" && snapshot.evidenceCoverage?.answerBaselinesPrepared > 0) {
    actions.qualified_conversations = actions.qualified_conversations.map((action) => action[0] === "Prepare the versioned answer baseline" ? [
      "Execute the versioned answer baseline",
      "Capture the prepared 30-query run across the configured answer surfaces under reproducible conditions.",
      "30 queries observed on each configured surface",
      2
    ] : action);
  }
  if (constraint.id === "qualified_conversations" && snapshot.evidenceCoverage?.campaignPublications > 0) {
    actions.qualified_conversations = actions.qualified_conversations.map((action) => action[0] === "Prepare a distribution pass" ? [
      "Distribute the live campaign",
      "Publish the campaign's organic social version and record channel, timestamp, public URL, and resulting visits.",
      "1 verified organic publication and 10 permitted contextual attempts or equivalent reach evidence",
      1
    ] : action);
  }
  return (actions[constraint.id] || []).slice(0, 3).map(([title, outcome, metric, dueInDays]) => {
    const baselineBlocked = title === "Execute the versioned answer baseline";
    const distributionBlocked = ["Prepare a distribution pass", "Distribute the live campaign"].includes(title) && snapshot.evidenceCoverage?.organicSocialPublications === 0;
    return {
      title,
      outcome,
      metric,
      owner,
      dueAt: addDays(now, dueInDays),
      executionStatus: baselineBlocked || distributionBlocked ? "blocked" : "ready",
      blocker: baselineBlocked
        ? snapshot.evidenceCoverage?.answerControlsCompleted > 0
          ? "The 30-query public-search control is complete, but no reproducible AI answer-surface adapter is available; OpenAI API access is also out of credits."
          : "No reproducible answer-surface adapter is available; OpenAI API access is also out of credits."
        : distributionBlocked
          ? `${snapshot.evidenceCoverage?.indexNowSubmissions > 0 ? "IndexNow received the revised campaign URL, but " : ""}no organic social publishing adapter is configured. Account-level messages also remain blocked until a permitted-contact basis is documented.`
          : null
    };
  });
}

function missionStatus(progress, agent, snapshot) {
  const unknown = progress.filter((metric) => metric.status === "unknown");
  const incomplete = progress.filter((metric) => !["achieved", "on_track"].includes(metric.status));
  const qualityMetrics = new Set(["First-response SLA (%)", "Required-field completion (%)", "Consent or unsupported-claim violations"]);
  const commercialIncomplete = progress.filter((metric) => !qualityMetrics.has(metric.metric) && metric.status !== "achieved");
  const qualityFailed = progress.filter((metric) => qualityMetrics.has(metric.metric) && !["achieved", "on_track"].includes(metric.status));
  const evidence = snapshot.missionEvidence || {};
  const evidenceChecks = [
    ["agreementAndPaymentVerified", "Verified agreement and required initial payment evidence are missing."],
    ["materialExperimentsComplete", "One or more material experiments lack a complete hypothesis-to-decision record."],
    ["caseStudyEvidenceSanitized", "The case-study evidence set has not been reviewed for sensitive or unsupported material."]
  ];
  const missingCompletionEvidence = evidenceChecks.filter(([key]) => evidence[key] !== true).map(([, message]) => message);
  const complete = unknown.length === 0 && commercialIncomplete.length === 0 && qualityFailed.length === 0 && missingCompletionEvidence.length === 0;
  const missingEvidence = [
    ...unknown.map((metric) => `${metric.metric} has no verified value.`),
    ...incomplete.filter((metric) => metric.status !== "unknown").map((metric) => `${metric.metric} is ${metric.status}.`)
  ];
  missingEvidence.push(...missingCompletionEvidence);
  return {
    complete,
    reason: complete
      ? `Every target and completion criterion is verified; generate ${agent.missionCompletion.caseStudyPath}.`
      : "The mission remains active because one or more targets or evidence requirements are incomplete.",
    missingEvidence
  };
}

export function buildOfflineBrief({ agent, snapshot, now = new Date() }) {
  const progressWithKeys = calculateProgress(agent, snapshot, now);
  const progress = progressWithKeys.map(({ key: _key, ...metric }) => metric);
  const constraint = determineConstraint(agent, snapshot, progressWithKeys);
  const priorityActions = offlineActions(constraint, now, snapshot);
  const mission = missionStatus(progress, agent, snapshot);
  const campaignPrepared = constraint.id === "qualified_conversations" && snapshot.evidenceCoverage?.campaignAssetsCreated > 0;
  const baselinePrepared = campaignPrepared && snapshot.evidenceCoverage?.answerBaselinesPrepared > 0;
  const answerControlCompleted = baselinePrepared && snapshot.evidenceCoverage?.answerControlsCompleted > 0;
  return {
    disclosure: agent.identity.disclosure,
    generatedAt: new Date(now).toISOString(),
    executiveSummary: `${constraint.name} is the current constraint. ${constraint.decision}`,
    currentConstraint: { name: constraint.name, evidence: constraint.evidence, decision: constraint.decision },
    progress,
    priorityActions,
    draft: {
      assetType: baselinePrepared ? "answer baseline execution brief" : campaignPrepared ? "campaign distribution brief" : constraint.id === "qualified_conversations" ? "buyer observation" : "operating brief",
      audience: "Evidence-rich B2B software and technical-service decision-makers",
      workingTitle: baselinePrepared ? "Representation Gap baseline execution blockers" : campaignPrepared ? "Representation Gap campaign distribution" : constraint.id === "qualified_conversations" ? "When AI still describes the product you retired" : `SWELL: ${constraint.name}`,
      thesis: constraint.decision,
      callToAction: constraint.id === "qualified_conversations" ? "Use the Representation Gap diagnostic to locate the earliest constraint." : "Verify the evidence gate and execute the next action.",
      body: baselinePrepared
        ? `${snapshot.evidenceCoverage?.campaignPublications > 0 ? "The first campaign article is live in production." : "The first campaign asset is prepared."} The ten-account research set and 30-query observation manifest are prepared.${answerControlCompleted ? " The public-search control is complete and narrowed the premise: current first-party evidence surfaced for 29 questions, while five descriptions were mixed or incomplete; this is not AI-answer evidence." : ""} No researched account has a documented permitted-contact basis. The OpenAI API has no remaining credits, no reproducible Google or Perplexity observation adapter is configured, and no organic social publishing adapter is connected. Do not convert relevance into implied permission or convert an unobserved query into a representation claim.`
        : constraint.id === "qualified_conversations"
        ? "A company can retire a product limitation and still meet it again in an AI-generated answer. The problem is not simply stale copy. It may begin with unclear entity definitions, inaccessible proof, fragmented evidence, or weak corroboration. Publishing more downstream content cannot reliably compensate for an upstream constraint. SWELL starts with a versioned Representation Baseline, locates the earliest constraint, and measures observed answers after corrective work. It does not guarantee rankings, citations, inclusion, traffic, or revenue. Use the Representation Gap diagnostic to identify the first layer worth verifying."
        : `${constraint.name} is the current operating constraint. ${constraint.evidence.join(" ")} ${constraint.decision}`,
      evidenceNeeded: constraint.evidence
    },
    learning: {
      hypothesis: constraint.id === "qualified_conversations"
        ? "Evidence-rich B2B companies with outdated AI descriptions will respond more often to a concrete failure pattern than to generic GEO services messaging."
        : `Resolving ${constraint.name.toLowerCase()} will produce the largest measurable improvement in qualified pipeline.`,
      observation: constraint.evidence.join(" "),
      result: "pending",
      decision: priorityActions[0]?.outcome || constraint.decision,
      evidence: constraint.evidence
    },
    mission,
    risks: [
      "Activity metrics absent from HubSpot and the append-only mission ledger remain unknown and must not be inferred.",
      "Autonomy does not override consent, suppression, evidence, security, or verified agreement-and-payment gates."
    ]
  };
}

export function buildAgentInstructions(agent, operatingModel) {
  return [
    `You are ${agent.displayName}, ${agent.role}.`,
    agent.identity.disclosure,
    agent.identity.impersonationPolicy,
    `Objective: ${agent.objective.statement}`,
    "Operate as an evidence-led GTM chief of staff. Analyze only the aggregated data supplied; never invent activity, evidence, customers, results, or authorization.",
    "Name one current constraint and return no more than three priority actions. Each action needs a measurable outcome, owner, due date, execution status, and any exact blocker.",
    "Operate autonomously. If a required evidence gate or integration is missing, mark the action blocked and name the exact blocker.",
    "Do not treat closed won or revenue as verified without agreement and required initial payment evidence.",
    "Record one testable hypothesis, the current observation, result state, decision, and supporting evidence on every run.",
    `Mission completion contract: ${JSON.stringify(agent.missionCompletion)}`,
    `Authority contract: ${JSON.stringify(agent.authority)}`,
    `Decision rules: ${JSON.stringify(agent.decisionRules)}`,
    `Canonical positioning, segments, qualification, offers, and governance: ${JSON.stringify(operatingModel)}`
  ].join("\n\n");
}

function extractOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text) return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI returned no structured output text.");
}

export async function runMasonAgent({
  agent,
  operatingModel,
  snapshot,
  context = "Run the daily SWELL operating review.",
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || "gpt-5.6",
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is required unless --offline is used.");
  const response = await fetchImpl(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: buildAgentInstructions(agent, operatingModel),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({ request: context, objective: agent.objective, cadence: agent.operatingCadence, snapshot })
        }]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "swell_gtm_operating_brief",
          strict: true,
          schema: MASON_BRIEF_SCHEMA
        }
      }
    }),
    signal: AbortSignal.timeout(60_000)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}: ${JSON.stringify(body).slice(0, 1200)}`);
  const brief = JSON.parse(extractOutputText(body));
  return { ...brief, model, responseId: body.id || null };
}
