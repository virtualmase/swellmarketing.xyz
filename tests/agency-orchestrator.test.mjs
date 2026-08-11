import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildAgencyRun,
  evaluateClientTransition,
  evaluateReviewEligibility,
  validateAgencyModel
} from "../lib/agency-orchestrator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const model = JSON.parse(await readFile(path.join(root, "data/agency-operating-model.json"), "utf8"));

test("agency model has valid lifecycle and authority definitions", () => {
  assert.deepEqual(validateAgencyModel(model), []);
  assert.ok(model.authorityPolicy.autonomous.length > 0);
  assert.ok(model.authorityPolicy.humanApprovalRequired.some((rule) => rule.includes("first launch")));
});

test("client transitions require a permitted path and verified exit fields", () => {
  const incomplete = {
    status: "pending_handoff",
    scope_version: "scope-v1",
    commercial_owner: "commercial-owner"
  };
  const blocked = evaluateClientTransition({ model, engagement: incomplete, to: "onboarding" });
  assert.equal(blocked.allowed, false);
  assert.deepEqual(blocked.missing, ["delivery_owner", "promises_made", "known_unknowns", "kickoff_at"]);

  const complete = {
    ...incomplete,
    delivery_owner: "delivery-owner",
    promises_made: "Signed scope only",
    known_unknowns: "Analytics access",
    kickoff_at: "2026-08-12T16:00:00.000Z"
  };
  assert.equal(evaluateClientTransition({ model, engagement: complete, to: "onboarding" }).allowed, true);
  assert.equal(evaluateClientTransition({ model, engagement: complete, to: "active" }).allowed, false);
});

test("review outreach uses objective completion, issue, and permission gates rather than sentiment", () => {
  const eligible = {
    delivery_accepted_at: "2026-08-01T16:00:00.000Z",
    private_feedback_status: "received",
    private_feedback_received_at: "2026-08-03T16:00:00.000Z",
    client_sentiment: "positive",
    open_issue_count: 0,
    review_outreach_permitted: true
  };
  assert.deepEqual(evaluateReviewEligibility(eligible), { eligible: true, reasons: [] });
  assert.equal(evaluateReviewEligibility({ ...eligible, client_sentiment: "negative" }).eligible, true);
  const unresolved = evaluateReviewEligibility({ ...eligible, open_issue_count: 1 });
  assert.equal(unresolved.eligible, false);
  assert.ok(unresolved.reasons.some((reason) => reason.includes("issue")));
});

test("agency run queues handoff, approved launch, stop condition, feedback, and review work with explicit authority", () => {
  const now = new Date("2026-08-10T16:00:00.000Z");
  const snapshot = {
    engagements: [
      {
        engagement_id: "eng_handoff",
        status: "pending_handoff",
        closed_won_at: "2026-08-09T12:00:00.000Z",
        owner: "delivery-owner",
        next_action: "Complete handoff",
        next_action_at: "2026-08-10T12:00:00.000Z",
        scope_version: "scope-v1",
        commercial_owner: "commercial-owner"
      },
      {
        engagement_id: "eng_advocacy",
        status: "completed",
        owner: "client-owner",
        next_action: "Request review",
        next_action_at: "2026-08-11T16:00:00.000Z",
        final_report: "report-v1",
        access_disposition: "removed",
        retention_follow_up_at: "2026-09-01T16:00:00.000Z",
        feedback_status: "positive_received",
        delivery_accepted_at: "2026-08-01T16:00:00.000Z",
        private_feedback_status: "received",
        private_feedback_received_at: "2026-08-03T16:00:00.000Z",
        client_sentiment: "positive",
        open_issue_count: 0,
        review_outreach_permitted: true,
        public_review_status: "not_requested"
      }
    ],
    campaigns: [
      {
        campaign_id: "campaign_launch",
        status: "scheduled",
        approved_by: "client-owner",
        approved_at: "2026-08-09T16:00:00.000Z",
        approved_brief_version: "brief-v2",
        tracking_validation: "passed",
        asset_validation: "passed",
        launch_at: "2026-08-10T15:00:00.000Z",
        rollback_owner: "campaign-owner"
      },
      {
        campaign_id: "campaign_stop",
        status: "live",
        launch_evidence: "platform-run-123",
        first_observation_at: "2026-08-10T14:00:00.000Z",
        stop_condition_fired: true,
        stop_event_id: "spend-cap-1",
        stop_reason: "Approved spend cap exceeded"
      }
    ]
  };

  const run = buildAgencyRun({ model, snapshot, now });
  const byType = Object.fromEntries(run.actions.map((item) => [item.type, item]));
  assert.equal(byType.prepare_handoff.authority, "autonomous");
  assert.equal(byType.launch_approved_campaign.authority, "policy_bound");
  assert.equal(byType.pause_campaign.authority, "autonomous");
  assert.equal(byType.request_public_review.authority, "policy_bound");
  assert.equal(run.summary.engagements, 2);
  assert.equal(run.summary.campaigns, 2);
  assert.ok(run.summary.overdue >= 3);
});

test("campaign approval cannot be silently converted into a launch", () => {
  const run = buildAgencyRun({
    model,
    now: new Date("2026-08-10T16:00:00.000Z"),
    snapshot: {
      campaigns: [{
        campaign_id: "campaign_approval",
        status: "awaiting_approval",
        approval_request_id: "approval-1",
        brief_version: "brief-v1",
        next_action_at: "2026-08-10T17:00:00.000Z"
      }]
    }
  });
  assert.ok(run.actions.some((item) => item.type === "request_campaign_approval" && item.authority === "human_approval_required"));
  assert.ok(!run.actions.some((item) => item.type === "launch_approved_campaign"));
});
