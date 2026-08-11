const ALLOWED_EVENT_TYPES = new Set([
  "connected_conversation",
  "discovery_completed",
  "proposal_issued",
  "first_response",
  "stage_exit_verified",
  "governance_violation",
  "agreement_verified",
  "payment_verified",
  "case_study_evidence_sanitized",
  "campaign_asset_created",
  "campaign_published",
  "campaign_iteration_published",
  "campaign_instrumentation_deployed",
  "target_set_created",
  "answer_baseline_prepared",
  "answer_control_completed",
  "distribution_attempt",
  "measurement_adapter_deployed",
  "crm_snapshot_captured",
  "answer_surface_adapter_configured"
]);

function verified(events, type) {
  return events.filter((event) => event.type === type && event.status === "verified");
}

function uniqueEntityCount(events) {
  return new Set(events.map((event) => event.entityId).filter(Boolean)).size;
}

export function validateMissionLedger(ledger) {
  const issues = [];
  if (!ledger || !Array.isArray(ledger.events)) return ["Mission ledger must contain an events array."];
  const ids = new Set();
  for (const [index, event] of ledger.events.entries()) {
    const label = event?.id || `event at index ${index}`;
    if (!event?.id) issues.push(`${label} has no immutable id`);
    else if (ids.has(event.id)) issues.push(`${label} is duplicated`);
    else ids.add(event.id);
    if (!ALLOWED_EVENT_TYPES.has(event?.type)) issues.push(`${label} has unsupported type ${event?.type}`);
    if (!Number.isFinite(Date.parse(event?.occurredAt))) issues.push(`${label} has an invalid occurredAt`);
    if (!event?.sourceSystem || !event?.sourceRef) issues.push(`${label} lacks sourceSystem or sourceRef`);
    if (!event?.status) issues.push(`${label} has no evidence status`);
    if (!Array.isArray(event?.evidence) || event.evidence.length === 0) issues.push(`${label} has no evidence references`);
  }
  return issues;
}

export function validateExperiments(registry) {
  const issues = [];
  if (!registry || !Array.isArray(registry.experiments)) return ["Experiment registry must contain an experiments array."];
  const ids = new Set();
  for (const experiment of registry.experiments) {
    if (!experiment?.id || ids.has(experiment.id)) issues.push(`Experiment id ${experiment?.id || "missing"} is missing or duplicated`);
    ids.add(experiment?.id);
    for (const field of ["hypothesis", "segment", "offer", "startsAt", "reviewAt", "endsAt", "status", "result"]) {
      if (experiment?.[field] === undefined || experiment[field] === null || experiment[field] === "") issues.push(`${experiment?.id || "experiment"} lacks ${field}`);
    }
    if (Date.parse(experiment?.reviewAt) < Date.parse(experiment?.startsAt)) issues.push(`${experiment.id} review date precedes its start date`);
    if (Date.parse(experiment?.endsAt) < Date.parse(experiment?.reviewAt)) issues.push(`${experiment.id} end date precedes its review date`);
    if (!Array.isArray(experiment?.primaryMetrics) || !experiment.primaryMetrics.length) issues.push(`${experiment.id} has no primary metrics`);
  }
  return issues;
}

export function deriveMissionEvidence(ledger, experimentRegistry) {
  const ledgerIssues = validateMissionLedger(ledger);
  const experimentIssues = validateExperiments(experimentRegistry);
  if (ledgerIssues.length || experimentIssues.length) throw new Error([...ledgerIssues, ...experimentIssues].join("; "));
  const events = ledger.events;
  const responses = verified(events, "first_response").filter((event) => Number.isFinite(event.data?.elapsedMinutes) && Number.isFinite(event.data?.slaMinutes));
  const stageExits = verified(events, "stage_exit_verified").filter((event) => Number.isFinite(event.data?.requiredFields) && Number.isFinite(event.data?.completedFields));
  const responseSla = responses.length
    ? responses.filter((event) => event.data.elapsedMinutes <= event.data.slaMinutes).length / responses.length * 100
    : null;
  const requiredFields = stageExits.reduce((sum, event) => sum + event.data.requiredFields, 0);
  const completedFields = stageExits.reduce((sum, event) => sum + event.data.completedFields, 0);
  const agreementOpportunities = new Set(verified(events, "agreement_verified").map((event) => event.entityId).filter(Boolean));
  const paymentOpportunities = new Set(verified(events, "payment_verified").map((event) => event.entityId).filter(Boolean));
  const agreementAndPaymentVerified = [...agreementOpportunities].some((id) => paymentOpportunities.has(id));
  const materialExperiments = experimentRegistry.experiments.filter((experiment) => experiment.material === true);
  const materialExperimentsComplete = materialExperiments.length > 0 && materialExperiments.every((experiment) => {
    return ["completed", "stopped"].includes(experiment.status) && ["supported", "rejected", "inconclusive"].includes(experiment.result) && Boolean(experiment.decision) && experiment.observations?.length > 0;
  });

  return {
    connectedBuyerConversations: uniqueEntityCount(verified(events, "connected_conversation")),
    completedDiscoveryCalls: uniqueEntityCount(verified(events, "discovery_completed")),
    proposalsIssued: uniqueEntityCount(verified(events, "proposal_issued")),
    firstResponseSlaPercent: responseSla === null ? null : Number(responseSla.toFixed(1)),
    requiredFieldCompletionPercent: requiredFields === 0 ? null : Number((completedFields / requiredFields * 100).toFixed(1)),
    consentOrUnsupportedClaimViolations: events.filter((event) => event.type === "governance_violation" && event.status !== "resolved").length,
    missionEvidence: {
      agreementAndPaymentVerified,
      materialExperimentsComplete,
      caseStudyEvidenceSanitized: verified(events, "case_study_evidence_sanitized").length > 0
    },
    coverage: {
      ledgerEvents: events.length,
      experiments: experimentRegistry.experiments.length,
      firstResponsesMeasured: responses.length,
      stageExitsMeasured: stageExits.length,
      campaignAssetsCreated: verified(events, "campaign_asset_created").length,
      campaignPublications: verified(events, "campaign_published").length,
      campaignIterationsPublished: verified(events, "campaign_iteration_published").length,
      targetSetsCreated: verified(events, "target_set_created").length,
      answerBaselinesPrepared: verified(events, "answer_baseline_prepared").length,
      answerControlsCompleted: verified(events, "answer_control_completed").length,
      targetAccountsResearched: verified(events, "target_set_created").reduce((sum, event) => sum + Number(event.data?.accounts || 0), 0),
      permittedDistributionAttempts: verified(events, "distribution_attempt").filter((event) => event.data?.permissionVerified === true).length,
      indexNowSubmissions: verified(events, "distribution_attempt").filter((event) => event.data?.channel === "indexnow" && event.data?.httpStatus === 200).length,
      organicSocialPublications: verified(events, "distribution_attempt").filter((event) => event.data?.channel === "organic_social" && event.data?.publicUrl).length,
      measurementAdaptersDeployed: verified(events, "measurement_adapter_deployed").length,
      crmSnapshotsCaptured: verified(events, "crm_snapshot_captured").length,
      answerSurfaceAdaptersConfigured: verified(events, "answer_surface_adapter_configured").length
    }
  };
}

export function applyMissionEvidence(snapshot, ledger, experimentRegistry) {
  const derived = deriveMissionEvidence(ledger, experimentRegistry);
  return {
    ...snapshot,
    contacts: {
      ...(snapshot.contacts || {}),
      connected: Math.max(Number(snapshot.contacts?.connected || 0), derived.connectedBuyerConversations)
    },
    activity: {
      completedDiscoveryCalls: derived.completedDiscoveryCalls,
      proposalsIssued: derived.proposalsIssued,
      firstResponseSlaPercent: derived.firstResponseSlaPercent,
      requiredFieldCompletionPercent: derived.requiredFieldCompletionPercent,
      consentOrUnsupportedClaimViolations: derived.consentOrUnsupportedClaimViolations
    },
    missionEvidence: derived.missionEvidence,
    evidenceCoverage: derived.coverage
  };
}
