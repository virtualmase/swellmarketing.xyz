import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RUNS_DIRECTORY = ".swell-agent/runs";

function safeTimestamp(value) {
  return new Date(value).toISOString().replaceAll(":", "-");
}

export async function recordAgentRun({ root, agent, snapshot, brief, context, recordType = "operating_review" }) {
  const directory = path.join(root, RUNS_DIRECTORY);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = `${safeTimestamp(brief.generatedAt)}.json`;
  const record = {
    schemaVersion: "1.1.0",
    agentId: agent.id,
    recordType,
    recordedAt: brief.generatedAt,
    context,
    snapshot,
    brief
  };
  const destination = path.join(directory, filename);
  await writeFile(destination, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return destination;
}

export async function recordDraftArtifact({ root, brief }) {
  const directory = path.join(root, ".swell-agent/artifacts");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const slug = String(brief.draft?.workingTitle || "agent-artifact")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "agent-artifact";
  const destination = path.join(directory, `${safeTimestamp(brief.generatedAt)}-${slug}.md`);
  const markdown = `# ${brief.draft.workingTitle}\n\n${brief.draft.body}\n\n## Evidence required before external use\n\n${brief.draft.evidenceNeeded.map((item) => `- ${item}`).join("\n")}\n`;
  await writeFile(destination, markdown, { encoding: "utf8", mode: 0o600 });
  return destination;
}

export async function readAgentRuns(root) {
  const directory = path.join(root, RUNS_DIRECTORY);
  let names = [];
  try { names = await readdir(directory); } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const runs = await Promise.all(names.filter((name) => name.endsWith(".json")).sort().map(async (name) => {
    return JSON.parse(await readFile(path.join(directory, name), "utf8"));
  }));
  return runs.filter((run) => run?.agentId === "mason-nguyen" && run?.recordType !== "rehearsal");
}

function metricMap(run) {
  return new Map((run.brief?.progress || []).map((metric) => [metric.metric, metric]));
}

function markdownCell(value) {
  return String(value ?? "Unknown").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function materialExperimentSections(experimentRegistry, runs) {
  const experiments = (experimentRegistry?.experiments || []).filter((experiment) => experiment.material === true);
  if (experiments.length) {
    return experiments.map((experiment, index) => {
      const observations = unique(experiment.observations || []);
      return [
        `### Experiment ${index + 1}: ${markdownCell(experiment.id)}`,
        "",
        `- Status: ${markdownCell(experiment.status)}`,
        `- Test window: ${markdownCell(experiment.startsAt)} through ${markdownCell(experiment.endsAt)}`,
        `- Segment: ${markdownCell(experiment.segment)}`,
        `- Offer: ${markdownCell(experiment.offer)}`,
        `- Hypothesis: ${markdownCell(experiment.hypothesis)}`,
        `- Result: ${markdownCell(experiment.result)}`,
        `- Decision: ${markdownCell(experiment.decision || "Pending the minimum review evidence")}`,
        "- Recorded observations:",
        ...(observations.length ? observations.map((item) => `  - ${markdownCell(item)}`) : ["  - No material observation has been recorded yet."])
      ].join("\n");
    }).join("\n\n");
  }

  const grouped = new Map();
  for (const run of runs) {
    const learning = run.brief?.learning;
    if (!learning?.hypothesis) continue;
    const group = grouped.get(learning.hypothesis) || {
      hypothesis: learning.hypothesis,
      observations: [],
      decisions: [],
      evidence: [],
      result: "pending",
      reviewCount: 0
    };
    group.reviewCount += 1;
    group.observations.push(learning.observation);
    group.decisions.push(learning.decision);
    group.evidence.push(...(learning.evidence || []));
    if (learning.result !== "pending") group.result = learning.result;
    grouped.set(learning.hypothesis, group);
  }
  return [...grouped.values()].map((learning, index) => [
    `### Experiment ${index + 1}`,
    "",
    `- Operating reviews: ${learning.reviewCount}`,
    `- Hypothesis: ${markdownCell(learning.hypothesis)}`,
    `- Observations: ${unique(learning.observations).map(markdownCell).join("; ")}`,
    `- Result: ${markdownCell(learning.result)}`,
    `- Decisions: ${unique(learning.decisions).map(markdownCell).join("; ")}`,
    `- Evidence: ${unique(learning.evidence).map(markdownCell).join("; ")}`
  ].join("\n")).join("\n\n");
}

export function buildMissionCaseStudy(agent, runs, { provisional = false, experimentRegistry = null } = {}) {
  if (!runs.length) throw new Error("No Mason agent runs are available for a case study.");
  const ordered = [...runs].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const first = ordered[0];
  const last = ordered.at(-1);
  if (!provisional && last.brief?.mission?.complete !== true) throw new Error("The SWELL mission is not complete; the final case study cannot be generated yet.");
  const firstMetrics = metricMap(first);
  const lastMetrics = metricMap(last);
  const rows = (last.brief?.progress || []).map((metric) => {
    const baseline = firstMetrics.get(metric.metric)?.current;
    return `| ${markdownCell(metric.metric)} | ${markdownCell(baseline)} | ${markdownCell(metric.current)} | ${markdownCell(metric.target)} | ${markdownCell(metric.status)} |`;
  }).join("\n");
  const learningSections = materialExperimentSections(experimentRegistry, ordered);
  const materialExperimentCount = experimentRegistry
    ? (experimentRegistry.experiments || []).filter((experiment) => experiment.material === true).length
    : new Set(ordered.map((run) => run.brief?.learning?.hypothesis).filter(Boolean)).size;
  const experimentLabel = materialExperimentCount === 1 ? "material experiment record" : "material experiment records";
  const label = provisional ? "Provisional case-study preview" : "Mission-complete case study";
  return `# SWELL 90-Day GTM Mission Case Study

> ${label}. Generated from ${ordered.length} sanitized Mason agent operating record(s) and ${materialExperimentCount} ${experimentLabel}. Facts below come from recorded aggregate metrics; interpretation is labeled in the experiment log.

## Mission

${agent.objective.statement}

- Operating period: ${agent.objective.startsAt} through ${agent.objective.endsAt}
- First recorded review: ${first.recordedAt}
- Final recorded review: ${last.recordedAt}
- Final status: ${last.brief?.mission?.complete ? "Complete" : "In progress"}

## Outcome

${last.brief?.executiveSummary || "No executive summary was recorded."}

| Metric | Baseline | Final | Target | Status |
|---|---:|---:|---:|---|
${rows}

## What SWELL tested and learned

${learningSections || "No complete experiment records were available."}

## Final constraint and decision

- Constraint: ${last.brief?.currentConstraint?.name || "Unknown"}
- Evidence: ${(last.brief?.currentConstraint?.evidence || []).join("; ") || "Unknown"}
- Decision: ${last.brief?.currentConstraint?.decision || "Unknown"}

## Governance

The Mason agent operated autonomously, but autonomy did not override consent, suppression, evidence, security, or verified agreement-and-payment requirements. This case study intentionally excludes credentials, personal CRM data, transcripts, and unsupported outcome claims.
`;
}

export async function writeMissionCaseStudy({ root, agent, runs, experimentRegistry = null }) {
  const destination = path.join(root, agent.missionCompletion.caseStudyPath);
  const markdown = buildMissionCaseStudy(agent, runs, { experimentRegistry });
  await writeFile(destination, markdown, { encoding: "utf8", mode: 0o600 });
  return destination;
}
