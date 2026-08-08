# Representation Baseline Template

Use this artifact to record how answer systems represent a brand before choosing interventions. Keep the query set, collection method, and scoring rules stable between runs.

## Baseline metadata

| Field | Value |
|---|---|
| Brand | |
| Canonical organization ID | |
| Collection date and timezone | |
| Researcher | |
| Markets and languages | |
| Platforms and model versions | |
| Signed-in or anonymous state | |
| Search or browsing enabled | |
| Prior baseline | |

## Scoring rules

Score only what is visible in the captured answer.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Inclusion | Brand absent | Brand mentioned indirectly or in a long list | Brand directly included in the answer |
| Accuracy | Materially wrong | Mixed, incomplete, or ambiguous | Material claims accurate |
| Attribution | Claims assigned incorrectly | Attribution unclear or partial | Claims assigned to the correct entity |
| Citation | No supporting source | Source present but weak or mismatched | Relevant source directly supports the claim |
| Actionability | No useful next step | Generic next step | Relevant, specific next step |

Do not combine these into a universal “GEO score.” Preserve the dimensions so a team can see what actually changed.

## Query portfolio

Give every query a stable ID. Classify its business role before collecting answers.

| Query ID | Exact prompt | Intent | Journey stage | Business relevance (1–3) | Expected evidence | Owner |
|---|---|---|---|---:|---|---|
| Q-001 | | Category | Discovery | | | |
| Q-002 | | Problem | Consideration | | | |
| Q-003 | | Comparison | Decision | | | |
| Q-004 | | Brand | Verification | | | |

## Answer observations

Store the full answer or screenshot outside this table and link it in `Evidence capture`.

| Run ID | Query ID | Platform | Inclusion | Accuracy | Attribution | Citation | Actionability | Named competitors | Evidence capture | Notes |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| | | | | | | | | | | |

## Representation gaps

A gap is the difference between an answer the brand can substantiate and the answer currently observed.

| Gap ID | Query IDs | Current representation | Supportable representation | Evidence available | Likely constraint | Business impact | Confidence |
|---|---|---|---|---|---|---|---|
| G-001 | | | | | Entity / access / evidence / corroboration / retrieval | | Low / medium / high |

## Constraint queue

Rank interventions after the evidence is collected. A high-impact item without a test is not ready to ship.

| Rank | Gap ID | Intervention | Dependency | Owner | Effort | Acceptance test | Review date |
|---:|---|---|---|---|---|---|---|
| 1 | | | | | | | |

## Answer change log

Record observations without claiming that one intervention caused a third-party model change.

| Date | Gap ID | Intervention shipped | Evidence URL | Queries re-run | Observed change | Alternative explanations | Next decision |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Quality gate

- [ ] Canonical entity IDs were verified before collection.
- [ ] Prompts were run verbatim under documented conditions.
- [ ] Full answers and citations were captured, not reconstructed from memory.
- [ ] Accuracy was checked against source evidence.
- [ ] Competitors were recorded even when the result was unfavorable.
- [ ] The next intervention addresses a documented constraint.
- [ ] Every queued intervention has an owner and acceptance test.
- [ ] Later changes are reported as observations, not guaranteed causality.
