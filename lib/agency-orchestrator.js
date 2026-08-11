function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function addHours(iso, hours) {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function addDays(iso, days) {
  return addHours(iso, days * 24);
}

function addBusinessDays(iso, days) {
  const result = new Date(iso);
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (![0, 6].includes(result.getUTCDay())) remaining -= 1;
  }
  return result.toISOString();
}

function atOrBefore(value, now) {
  return hasValue(value) && new Date(value).getTime() <= now.getTime();
}

function daysUntil(value, now) {
  return (new Date(value).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
}

function action({ id, type, authority, reason, dueAt, recordType, recordId, payload = {} }) {
  return { id, type, authority, reason, dueAt, recordType, recordId, payload };
}

export function validateAgencyModel(model) {
  const errors = [];
  if (!model?.version) errors.push("version is required");
  if (!Array.isArray(model?.clientLifecycle) || !model.clientLifecycle.length) errors.push("clientLifecycle is required");
  if (!Array.isArray(model?.campaignLifecycle) || !model.campaignLifecycle.length) errors.push("campaignLifecycle is required");
  if (!model?.allowedClientTransitions) errors.push("allowedClientTransitions is required");
  if (!model?.authorityPolicy) errors.push("authorityPolicy is required");

  const clientIds = new Set();
  for (const stage of model?.clientLifecycle || []) {
    if (!stage.id) errors.push("every client lifecycle stage requires an id");
    if (clientIds.has(stage.id)) errors.push(`duplicate client lifecycle stage: ${stage.id}`);
    clientIds.add(stage.id);
    if (!Array.isArray(stage.requiredExit)) errors.push(`client stage ${stage.id || "unknown"} requires requiredExit`);
  }

  for (const [from, targets] of Object.entries(model?.allowedClientTransitions || {})) {
    if (!clientIds.has(from)) errors.push(`transition source is not a client stage: ${from}`);
    for (const target of targets || []) {
      if (!clientIds.has(target)) errors.push(`transition target is not a client stage: ${target}`);
    }
  }

  const campaignIds = new Set();
  for (const stage of model?.campaignLifecycle || []) {
    if (!stage.id) errors.push("every campaign lifecycle stage requires an id");
    if (campaignIds.has(stage.id)) errors.push(`duplicate campaign lifecycle stage: ${stage.id}`);
    campaignIds.add(stage.id);
    if (!Array.isArray(stage.requiredExit)) errors.push(`campaign stage ${stage.id || "unknown"} requires requiredExit`);
  }
  return errors;
}

export function missingRequiredFields(record, fields = []) {
  return fields.filter((field) => !hasValue(record?.[field]));
}

export function evaluateClientTransition({ model, engagement, to }) {
  const stage = model.clientLifecycle.find((candidate) => candidate.id === engagement?.status);
  if (!stage) return { allowed: false, missing: [], reason: `Unknown current client stage: ${engagement?.status || "missing"}` };
  const permitted = model.allowedClientTransitions[stage.id] || [];
  if (!permitted.includes(to)) return { allowed: false, missing: [], reason: `${stage.id} cannot transition to ${to}` };
  const missing = missingRequiredFields(engagement, stage.requiredExit);
  if (missing.length) return { allowed: false, missing, reason: `${stage.id} exit requirements are incomplete` };
  return { allowed: true, missing: [], reason: `${stage.id} exit requirements are verified` };
}

export function evaluateReviewEligibility(engagement) {
  const missing = missingRequiredFields(engagement, [
    "delivery_accepted_at",
    "private_feedback_status",
    "open_issue_count",
    "review_outreach_permitted"
  ]);
  const reasons = [];
  if (missing.length) reasons.push(`Missing: ${missing.join(", ")}`);
  if (!["received", "closed"].includes(engagement?.private_feedback_status)) reasons.push("The neutral private-feedback step is not complete");
  if (Number(engagement?.open_issue_count) !== 0) reasons.push("A client issue remains open");
  if (engagement?.review_outreach_permitted !== true) reasons.push("Review outreach is not permitted");
  return { eligible: reasons.length === 0, reasons };
}

function engagementActions(model, engagement, now) {
  const actions = [];
  const id = engagement.engagement_id;
  const stage = model.clientLifecycle.find((candidate) => candidate.id === engagement.status);
  if (!stage) {
    actions.push(action({
      id: `engagement:${id}:invalid-stage`, type: "create_exception", authority: "autonomous",
      reason: `Unknown engagement stage: ${engagement.status || "missing"}`, dueAt: now.toISOString(), recordType: "engagement", recordId: id
    }));
    return actions;
  }

  const missing = missingRequiredFields(engagement, stage.requiredExit);
  if (missing.length) {
    actions.push(action({
      id: `engagement:${id}:${stage.id}:requirements`, type: "complete_stage_requirements", authority: "autonomous",
      reason: `${stage.id} is missing required fields`, dueAt: engagement.next_action_at || now.toISOString(), recordType: "engagement", recordId: id,
      payload: { stage: stage.id, missing }
    }));
  }

  if (stage.id !== "offboarded" && (!hasValue(engagement.owner) || !hasValue(engagement.next_action) || !hasValue(engagement.next_action_at))) {
    actions.push(action({
      id: `engagement:${id}:control-fields`, type: "repair_record_control_fields", authority: "autonomous",
      reason: "Every open engagement needs one owner, next action, and due date", dueAt: now.toISOString(), recordType: "engagement", recordId: id,
      payload: { missing: missingRequiredFields(engagement, ["owner", "next_action", "next_action_at"]) }
    }));
  }

  if (stage.id === "pending_handoff") {
    const dueAt = addHours(engagement.closed_won_at || engagement.created_at || now.toISOString(), model.serviceLevels.wonHandoffHours);
    actions.push(action({
      id: `engagement:${id}:handoff`, type: missing.length ? "prepare_handoff" : "accept_handoff", authority: missing.length ? "autonomous" : "human_approval_required",
      reason: missing.length ? "Closed-won handoff must be completed from verified commercial facts" : "Delivery owner must accept the scope before onboarding",
      dueAt, recordType: "engagement", recordId: id, payload: { missing }
    }));
  }

  if (stage.id === "onboarding" && missing.length) {
    actions.push(action({
      id: `engagement:${id}:onboarding-inputs`, type: "request_onboarding_inputs", authority: "policy_bound",
      reason: "Onboarding inputs are incomplete", dueAt: addBusinessDays(now.toISOString(), model.serviceLevels.onboardingInputReminderBusinessDays),
      recordType: "engagement", recordId: id, payload: { missing }
    }));
  }

  if (stage.id === "strategy_ready") {
    actions.push(action({
      id: `engagement:${id}:launch-review`, type: "request_first_launch_approval", authority: "human_approval_required",
      reason: "Strategy approval does not authorize a campaign's first external launch", dueAt: engagement.next_action_at || now.toISOString(),
      recordType: "engagement", recordId: id, payload: { campaignBriefIds: engagement.campaign_brief_ids || [] }
    }));
  }

  const blockedItems = (engagement.work_items || []).filter((item) => item.status === "blocked");
  for (const item of blockedItems) {
    const dueAt = addHours(item.blocked_at || now.toISOString(), model.serviceLevels.blockedWorkEscalationHours);
    actions.push(action({
      id: `work-item:${item.work_item_id}:blocked`, type: "escalate_blocked_work", authority: "autonomous",
      reason: item.blocker || "Delivery work is blocked", dueAt, recordType: "work_item", recordId: item.work_item_id,
      payload: { engagementId: id, blockerOwner: item.blocker_owner }
    }));
  }

  if (["active", "renewal_due"].includes(stage.id) && engagement.report_due_at && atOrBefore(engagement.report_due_at, now)) {
    actions.push(action({
      id: `engagement:${id}:report:${engagement.report_period || engagement.report_due_at}`, type: "prepare_client_report", authority: "autonomous",
      reason: "A versioned client report is due", dueAt: engagement.report_due_at, recordType: "engagement", recordId: id
    }));
  }

  if (stage.id === "active" && engagement.term_end_at && daysUntil(engagement.term_end_at, now) <= model.serviceLevels.renewalDecisionWindowDays) {
    actions.push(action({
      id: `engagement:${id}:renewal`, type: "prepare_renewal_decision", authority: "human_approval_required",
      reason: "The engagement is inside its renewal decision window", dueAt: engagement.term_end_at, recordType: "engagement", recordId: id
    }));
  }

  if (["completed", "offboarded"].includes(stage.id) && engagement.delivery_accepted_at && engagement.private_feedback_status === "not_requested") {
    actions.push(action({
      id: `engagement:${id}:private-feedback`, type: "request_private_feedback", authority: "policy_bound",
      reason: "Accepted delivery is eligible for a neutral private feedback request", dueAt: addDays(engagement.delivery_accepted_at, model.serviceLevels.privateFeedbackRequestDaysAfterAcceptance),
      recordType: "engagement", recordId: id
    }));
  }

  const review = evaluateReviewEligibility(engagement);
  if (["completed", "offboarded"].includes(stage.id) && review.eligible && engagement.public_review_status === "not_requested") {
    actions.push(action({
      id: `engagement:${id}:public-review`, type: "request_public_review", authority: "policy_bound",
      reason: "Delivery is accepted, the neutral feedback step is complete, issues are resolved, and outreach is permitted regardless of sentiment",
      dueAt: addDays(engagement.private_feedback_received_at || engagement.delivery_accepted_at, model.serviceLevels.publicReviewRequestDaysAfterPositiveFeedback),
      recordType: "engagement", recordId: id
    }));
  }
  return actions;
}

function campaignActions(model, campaign, now) {
  const actions = [];
  const id = campaign.campaign_id;
  const stage = model.campaignLifecycle.find((candidate) => candidate.id === campaign.status);
  if (!stage) {
    return [action({
      id: `campaign:${id}:invalid-stage`, type: "create_exception", authority: "autonomous",
      reason: `Unknown campaign stage: ${campaign.status || "missing"}`, dueAt: now.toISOString(), recordType: "campaign", recordId: id
    })];
  }

  const missing = missingRequiredFields(campaign, stage.requiredExit);
  if (missing.length) {
    actions.push(action({
      id: `campaign:${id}:${stage.id}:requirements`, type: "complete_stage_requirements", authority: "autonomous",
      reason: `${stage.id} is missing required fields`, dueAt: campaign.next_action_at || now.toISOString(), recordType: "campaign", recordId: id,
      payload: { stage: stage.id, missing }
    }));
  }

  if (campaign.stop_condition_fired === true && ["scheduled", "live", "optimizing"].includes(stage.id)) {
    actions.push(action({
      id: `campaign:${id}:stop-condition:${campaign.stop_event_id || "current"}`, type: "pause_campaign", authority: "autonomous",
      reason: campaign.stop_reason || "An approved stop condition fired", dueAt: now.toISOString(), recordType: "campaign", recordId: id,
      payload: { notifyOwner: true, preserveEvidence: true }
    }));
    return actions;
  }

  if (stage.id === "awaiting_approval") {
    actions.push(action({
      id: `campaign:${id}:approval`, type: "request_campaign_approval", authority: "human_approval_required",
      reason: "The first launch, claims, budget, audience, and channel require an approved brief version", dueAt: campaign.next_action_at || now.toISOString(),
      recordType: "campaign", recordId: id, payload: { briefVersion: campaign.brief_version }
    }));
  }

  if (stage.id === "scheduled" && !missing.length && atOrBefore(campaign.launch_at, now)) {
    actions.push(action({
      id: `campaign:${id}:launch:${campaign.approved_brief_version}`, type: "launch_approved_campaign", authority: "policy_bound",
      reason: "Approved brief, tracking, assets, launch time, and rollback owner are verified", dueAt: campaign.launch_at,
      recordType: "campaign", recordId: id, payload: { approvedBriefVersion: campaign.approved_brief_version }
    }));
  }

  if (["live", "optimizing"].includes(stage.id) && campaign.review_at && atOrBefore(campaign.review_at, now)) {
    actions.push(action({
      id: `campaign:${id}:review:${campaign.review_at}`, type: "analyze_campaign", authority: "autonomous",
      reason: "The campaign reached its documented review point", dueAt: campaign.review_at, recordType: "campaign", recordId: id
    }));
  }
  return actions;
}

export function buildAgencyRun({ model, snapshot = {}, now = new Date() }) {
  const errors = validateAgencyModel(model);
  if (errors.length) throw new Error(`Invalid agency operating model: ${errors.join("; ")}`);
  const generatedAt = now.toISOString();
  const actions = [
    ...(snapshot.engagements || []).flatMap((engagement) => engagementActions(model, engagement, now)),
    ...(snapshot.campaigns || []).flatMap((campaign) => campaignActions(model, campaign, now))
  ];
  actions.sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime() || left.id.localeCompare(right.id));
  return {
    schemaVersion: "1.0.0",
    modelVersion: model.version,
    generatedAt,
    summary: {
      engagements: (snapshot.engagements || []).length,
      campaigns: (snapshot.campaigns || []).length,
      actions: actions.length,
      overdue: actions.filter((item) => atOrBefore(item.dueAt, now)).length,
      humanApprovals: actions.filter((item) => item.authority === "human_approval_required").length,
      policyBound: actions.filter((item) => item.authority === "policy_bound").length,
      autonomous: actions.filter((item) => item.authority === "autonomous").length
    },
    actions
  };
}
