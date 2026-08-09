# Mason Nguyen SWELL GTM Agent

## Purpose

Mason Nguyen is SWELL's autonomous AI GTM operating agent. It runs the 90-day mission defined in `data/mason-agent.json`, selects one constraint at a time, creates no more than three measurable priority actions, and preserves an experiment record for the final case study.

The name is an operating identity, not a claim that the agent is the human Mason Nguyen. Every agent output includes that disclosure.

## What the agent does

- Reads aggregated SWELL HubSpot metrics and the canonical GTM operating model.
- Measures progress against conversations, opportunities, discovery, proposals, pipeline, revenue, SLA, data quality, and governance targets.
- Chooses the current constraint before proposing more demand activity.
- Produces structured actions, an asset brief, a testable hypothesis, observations, and a decision.
- Creates the run's draft artifact autonomously under `.swell-agent/artifacts/` and marks the matching action executed.
- Records each run privately under `.swell-agent/runs/`.
- Excludes records explicitly labeled `rehearsal` from case-study evidence.
- Generates `docs/SWELL_MISSION_CASE_STUDY.md` automatically only after every completion gate is verified.

The current implementation can analyze live HubSpot data, reason with the OpenAI Responses API, create local operating artifacts, and generate the final case study. External publishing, messaging, and CRM mutations require configured adapters before the agent can execute them; missing adapters are operational blockers, not approval requests.

## Autonomy boundaries

No human approval queue is part of the workflow. The agent acts when its required evidence and technical capability are present.

Autonomy does not permit the agent to infer consent, bypass suppression, fabricate proof, leak personal data, change configured commercial terms, or declare revenue without verified agreement and required initial payment. Voice recording and outbound automation remain unavailable until notice, consent, retention, jurisdiction, and suppression controls are configured.

## Run locally

Run the deterministic operating loop without network access:

```bash
node scripts/mason-agent.mjs \
  --offline \
  --snapshot data/mason-agent-snapshot.example.json \
  --date 2026-08-09T20:58:00Z
```

Run against live aggregate HubSpot data and OpenAI:

```bash
export HUBSPOT_ACCESS_TOKEN="..."
export OPENAI_API_KEY="..."
node scripts/mason-agent.mjs
```

`OPENAI_MODEL` is optional and defaults to `gpt-5.6`. Secrets belong in local or platform secret storage, never in the repository.

Useful options:

- `--context "..."` supplies a specific operating request.
- `--snapshot <path>` uses a saved aggregate snapshot instead of HubSpot.
- `--output <path>` also writes the generated brief to a chosen file.
- `--no-record` suppresses the private experiment record for a test run.
- `--date <ISO date>` makes a run reproducible.
- `--strict-ai` disables the automatic deterministic fallback and fails if OpenAI is unavailable.

If OpenAI is unreachable or returns an API error, the default behavior is to continue with the deterministic SWELL decision engine and record the degraded execution mode. This keeps measurement, constraint selection, artifact creation, and mission documentation running without silently pretending model reasoning occurred.

## Experiment record

Each recorded run contains:

- The aggregate input snapshot.
- The selected constraint and its evidence.
- The proposed or executed actions.
- The hypothesis, observation, result state, and decision.
- Mission status and any missing evidence.

The run directory is git-ignored because future aggregate snapshots may still be commercially sensitive. The final case study includes only sanitized aggregate metrics and documented interpretations.

Mission, target-account, answer-control, and private operating records are also listed in `.vercelignore`. They remain available to the local agent but are excluded from Vercel uploads. A production deployment is not accepted until representative private paths return HTTP 404.

## Current campaign controls

- `data/representation-gap-baseline-run.json` preserves the 30-query answer-surface manifest.
- `data/representation-gap-public-search-control.json` records the completed public-search control. It is explicitly not an AI-answer observation.
- `scripts/check-representation-control.mjs` verifies query coverage, assessments, source URLs, surface labeling, and deployment exclusions.
- `scripts/submit-indexnow.mjs` provides an owned search-discovery adapter. HTTP 200 proves notification receipt only; crawling, indexing, ranking, and visits remain separate observations.

## Mission completion and case study

The agent will report the mission complete only when:

1. Every commercial and quality metric has a verified value and passes its target.
2. Agreement and required initial payment evidence exist for the first engagement.
3. Every material experiment has a complete hypothesis-to-decision record.
4. The case-study evidence set is marked sanitized.

On the first complete run, the agent writes the final case study automatically. A provisional preview can be printed without creating the final artifact:

```bash
node scripts/mason-case-study.mjs --preview
```

Running `node scripts/mason-case-study.mjs` without `--preview` fails closed until the latest recorded run is complete.

## Current measurement limitation

HubSpot supplies contact, deal, and task aggregates. The append-only `data/mission-activity-ledger.json` supplies verified discoveries, proposals, first-response timing, stage-exit field completeness, governance events, and mission-completion evidence. A metric remains `null` or `false` until a dated ledger event points to its authoritative source; the agent will not infer it.
