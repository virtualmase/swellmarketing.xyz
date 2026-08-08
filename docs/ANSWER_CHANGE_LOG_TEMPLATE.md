# Answer Change Log Template

Use this log to compare observed AI answers before and after an intervention. It records change without claiming that one action caused a third-party model output.

## Measurement contract

Document these conditions before comparing runs.

| Field | Value |
|---|---|
| Query portfolio version | |
| Platforms and model versions | |
| Market and language | |
| Signed-in or anonymous state | |
| Search or browsing enabled | |
| Collection cadence | |
| Evidence storage location | |
| Reviewer | |

If the collection conditions change, start a new comparison series or label the break explicitly.

## Intervention register

| Intervention ID | Gap ID | Date shipped | Change made | Pages or entities affected | Evidence URL | Acceptance test | Test result |
|---|---|---|---|---|---|---|---|
| I-001 | | | | | | | Pass / fail / partial |

## Answer observations

| Run ID | Date | Query ID | Platform | Inclusion | Accuracy | Attribution | Citation | Named competitors | Full capture | Reviewer notes |
|---|---|---|---|---:|---:|---:|---:|---|---|---|
| | | | | | | | | | | |

Use the same dimensional rules defined in the Representation Baseline. Do not collapse the dimensions into one score.

## Change review

| Review ID | Query ID | Before run | After run | Observed change | Related interventions | Alternative explanations | Confidence | Next decision |
|---|---|---|---|---|---|---|---|---|
| CR-001 | | | | | | Model update / retrieval change / source change / sampling variation / unknown | Low / medium / high | |

## Reporting language

Use:

- “After intervention I-001, the next three captured runs included the brand.”
- “The citation changed from source A to source B under the documented test conditions.”
- “This observation is consistent with the intervention, but causality is not established.”

Avoid:

- “We made the model cite the brand.”
- “This change proves the optimization worked.”
- “Visibility increased” without naming the query set, platform, period, and dimension.

## Quality gate

- [ ] Before and after runs use comparable collection conditions.
- [ ] Exact prompts and full answers are retained.
- [ ] Every intervention has an acceptance-test result.
- [ ] Observed changes link to source captures.
- [ ] Competitor gains and regressions are reported.
- [ ] Alternative explanations are considered.
- [ ] Causal language does not exceed the evidence.

