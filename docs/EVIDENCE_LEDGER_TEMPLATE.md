# Evidence Ledger Template

Use this ledger to connect the claims a brand wants represented with proof that a human or answer system can inspect. One row represents one claim—not one page, campaign, or keyword.

## Ledger metadata

| Field | Value |
|---|---|
| Organization | |
| Canonical organization ID | |
| Ledger owner | |
| Review cadence | |
| Last reviewed | |
| Next review | |

## Claim ledger

| Claim ID | Exact claim | Entity making the claim | Buyer question | Business relevance (1–3) | First-party evidence | Independent corroboration | Canonical page | Evidence owner | Status | Review date |
|---|---|---|---|---:|---|---|---|---|---|---|
| C-001 | | | | | | | | | Missing / partial / verified / retired | |

## Evidence acceptance test

A claim is `verified` only when:

- The entity making the claim is unambiguous.
- The wording is specific enough to verify or falsify.
- The canonical page states the claim in accessible, indexable content.
- First-party evidence directly supports the claim.
- Independent corroboration is recorded when the claim requires it.
- Sources are live, relevant, and correctly attributed.
- An owner and review date exist.

Claims that fail the test remain `missing` or `partial`. Do not soften the status to improve a report.

## Evidence gaps

| Gap ID | Claim ID | Missing evidence | Risk if published | Required action | Owner | Acceptance test | Due date |
|---|---|---|---|---|---|---|---|
| EG-001 | | | Low / medium / high | | | | |

## Retirement log

Retain retired claims so outdated evidence does not quietly return to future content.

| Claim ID | Retirement date | Reason | Pages to update | Structured data to update | External corrections needed | Owner |
|---|---|---|---|---|---|---|
| | | | | | | |

## Quality gate

- [ ] Each row contains one testable claim.
- [ ] Claims are assigned to the correct entity.
- [ ] Evidence supports the exact wording used.
- [ ] Owned and independent evidence are not conflated.
- [ ] URLs resolve to the cited material.
- [ ] Unsupported claims are not marked verified.
- [ ] Expired or contradicted claims are retired everywhere they appear.

