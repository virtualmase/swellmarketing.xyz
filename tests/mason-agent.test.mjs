import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildOfflineBrief, runMasonAgent } from "../lib/mason-agent.js";
import { buildMissionCaseStudy, readAgentRuns, recordAgentRun, recordDraftArtifact, writeMissionCaseStudy } from "../lib/mason-case-study.js";
import { applyMissionEvidence, deriveMissionEvidence, validateMissionLedger } from "../lib/mission-evidence.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

test("offline agent selects demand creation and records learning without an approval queue", async () => {
  const agent = await json("data/mason-agent.json");
  const snapshot = await json("data/mason-agent-snapshot.example.json");
  const brief = buildOfflineBrief({ agent, snapshot, now: new Date("2026-08-10T16:00:00Z") });

  assert.equal(brief.currentConstraint.name, "Qualified conversation creation");
  assert.equal(brief.priorityActions.length, 3);
  assert.equal(brief.priorityActions[0].executionStatus, "ready");
  assert.equal("approvalRequired" in brief.priorityActions[0], false);
  assert.equal(brief.learning.result, "pending");
  assert.match(brief.draft.body, /Representation Baseline/);
  assert.equal(brief.mission.complete, false);
  assert.match(brief.disclosure, /not the human Mason Nguyen/);
});

test("mission completes only when targets and evidence gates are verified", async () => {
  const agent = await json("data/mason-agent.json");
  const snapshot = await json("data/mason-agent-snapshot.example.json");
  snapshot.contacts.connected = 12;
  snapshot.pipeline.swellTotalDeals = 4;
  snapshot.pipeline.openAmount = 10000;
  snapshot.pipeline.closedWonCount = 1;
  snapshot.pipeline.closedWonRevenue = 2500;
  snapshot.activity = {
    completedDiscoveryCalls: 3,
    proposalsIssued: 2,
    firstResponseSlaPercent: 95,
    requiredFieldCompletionPercent: 100,
    consentOrUnsupportedClaimViolations: 0
  };
  snapshot.missionEvidence = {
    agreementAndPaymentVerified: true,
    materialExperimentsComplete: true,
    caseStudyEvidenceSanitized: true
  };

  const brief = buildOfflineBrief({ agent, snapshot, now: new Date("2026-11-07T16:00:00Z") });
  assert.equal(brief.mission.complete, true);

  snapshot.missionEvidence.agreementAndPaymentVerified = false;
  const blocked = buildOfflineBrief({ agent, snapshot, now: new Date("2026-11-07T16:00:00Z") });
  assert.equal(blocked.mission.complete, false);
  assert.ok(blocked.mission.missingEvidence.some((item) => item.includes("payment")));
});

test("OpenAI runner requests strict structured output without storage", async () => {
  const agent = await json("data/mason-agent.json");
  const operatingModel = await json("data/gtm-operating-model.json");
  const snapshot = await json("data/mason-agent-snapshot.example.json");
  const expected = buildOfflineBrief({ agent, snapshot, now: new Date("2026-08-10T16:00:00Z") });
  let requestBody;
  const fetchImpl = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: "resp_test", output_text: JSON.stringify(expected) }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const result = await runMasonAgent({ agent, operatingModel, snapshot, apiKey: "test", fetchImpl });
  assert.equal(result.responseId, "resp_test");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(requestBody.model, "gpt-5.6");
});

test("case study persists only after a complete recorded run", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "swell-mason-agent-"));
  const agent = await json("data/mason-agent.json");
  agent.missionCompletion.caseStudyPath = "case-study.md";
  const snapshot = await json("data/mason-agent-snapshot.example.json");
  const incomplete = buildOfflineBrief({ agent, snapshot, now: new Date("2026-08-10T16:00:00Z") });
  const artifact = await recordDraftArtifact({ root: temporaryRoot, brief: incomplete });
  assert.match(await readFile(artifact, "utf8"), /Evidence required before external use/);
  await recordAgentRun({ root: temporaryRoot, agent, snapshot, brief: incomplete, context: "test" });
  let runs = await readAgentRuns(temporaryRoot);
  assert.throws(() => buildMissionCaseStudy(agent, runs), /not complete/);

  const complete = structuredClone(incomplete);
  complete.generatedAt = "2026-11-07T16:00:00.000Z";
  complete.mission = { complete: true, reason: "Verified.", missingEvidence: [] };
  complete.learning.result = "supported";
  await recordAgentRun({ root: temporaryRoot, agent, snapshot, brief: complete, context: "test complete" });
  runs = await readAgentRuns(temporaryRoot);
  const experimentRegistry = { experiments: [{
    id: "representation_gap_test",
    material: true,
    status: "completed",
    startsAt: "2026-08-10",
    endsAt: "2026-11-07",
    segment: "Evidence-rich B2B",
    offer: "Representation Baseline",
    hypothesis: complete.learning.hypothesis,
    result: "supported",
    decision: "Continue",
    observations: ["Verified observation"]
  }] };
  const destination = await writeMissionCaseStudy({ root: temporaryRoot, agent, runs, experimentRegistry });
  const markdown = await readFile(destination, "utf8");
  assert.match(markdown, /Mission-complete case study/);
  assert.match(markdown, /1 material experiment record/);
  assert.match(markdown, /Experiment 1: representation_gap_test/);
  assert.doesNotMatch(markdown, /Experiment 2/);
});

test("mission ledger derives activity metrics without inventing missing values", async () => {
  const ledger = await json("data/mission-activity-ledger.json");
  const experiments = await json("data/mission-experiments.json");
  assert.deepEqual(validateMissionLedger(ledger), []);
  const derived = deriveMissionEvidence(ledger, experiments);
  assert.equal(derived.coverage.targetAccountsResearched, 10);
  assert.equal(derived.coverage.answerBaselinesPrepared, 1);
  assert.equal(derived.completedDiscoveryCalls, 0);
  assert.equal(derived.firstResponseSlaPercent, null);
  assert.equal(derived.missionEvidence.materialExperimentsComplete, false);

  const snapshot = applyMissionEvidence(await json("data/mason-agent-snapshot.example.json"), ledger, experiments);
  assert.equal(snapshot.activity.requiredFieldCompletionPercent, null);
  assert.equal(snapshot.evidenceCoverage.campaignAssetsCreated, 1);
  assert.equal(snapshot.evidenceCoverage.campaignPublications, 1);
  assert.equal(snapshot.evidenceCoverage.campaignIterationsPublished, 1);
  assert.equal(snapshot.evidenceCoverage.answerControlsCompleted, 1);
  assert.equal(snapshot.evidenceCoverage.indexNowSubmissions, 1);
  assert.equal(snapshot.evidenceCoverage.organicSocialPublications, 0);
  assert.equal(snapshot.activity.consentOrUnsupportedClaimViolations, 0);
});

test("mission ledger verifies SLA, stage quality, and close evidence from dated events", async () => {
  const base = {
    occurredAt: "2026-10-01T12:00:00.000Z",
    status: "verified",
    sourceSystem: "test",
    sourceRef: "test-fixture",
    evidence: ["test-fixture"]
  };
  const ledger = { events: [
    { ...base, id: "connected_1", type: "connected_conversation", entityId: "contact_1" },
    { ...base, id: "connected_1_repeat", type: "connected_conversation", entityId: "contact_1" },
    { ...base, id: "discovery_1", type: "discovery_completed", entityId: "deal_1" },
    { ...base, id: "proposal_1", type: "proposal_issued", entityId: "deal_1" },
    { ...base, id: "response_1", type: "first_response", entityId: "contact_1", data: { elapsedMinutes: 7, slaMinutes: 10 } },
    { ...base, id: "response_2", type: "first_response", entityId: "contact_2", data: { elapsedMinutes: 14, slaMinutes: 10 } },
    { ...base, id: "stage_exit_1", type: "stage_exit_verified", entityId: "deal_1", data: { completedFields: 8, requiredFields: 8 } },
    { ...base, id: "agreement_1", type: "agreement_verified", entityId: "deal_1" },
    { ...base, id: "payment_1", type: "payment_verified", entityId: "deal_1" },
    { ...base, id: "sanitized_1", type: "case_study_evidence_sanitized", entityId: "mission" }
  ] };
  const experiments = { experiments: [{
    id: "experiment_1", material: true, hypothesis: "Test", segment: "B2B", offer: "Baseline",
    startsAt: "2026-08-10", reviewAt: "2026-09-07", endsAt: "2026-11-07",
    status: "completed", result: "supported", decision: "Continue", observations: ["Observed"], primaryMetrics: ["qualified_pipeline"]
  }] };
  const derived = deriveMissionEvidence(ledger, experiments);
  assert.equal(derived.connectedBuyerConversations, 1);
  assert.equal(derived.completedDiscoveryCalls, 1);
  assert.equal(derived.proposalsIssued, 1);
  assert.equal(derived.firstResponseSlaPercent, 50);
  assert.equal(derived.requiredFieldCompletionPercent, 100);
  assert.equal(derived.missionEvidence.agreementAndPaymentVerified, true);
  assert.equal(derived.missionEvidence.materialExperimentsComplete, true);
  assert.equal(derived.missionEvidence.caseStudyEvidenceSanitized, true);
});
