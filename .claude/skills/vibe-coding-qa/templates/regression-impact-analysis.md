# Regression Impact Analysis

Replace or delete all example rows before using this artifact for a real project.

## Change Summary

- Requirement / change ID:
- Change type: requirement / code / test / config / environment
- Changed behavior:
- Impacted modules / APIs / pages:
- Author / owner:

## Impact Analysis

| Changed item | Impacted existing behavior | Existing tests to rerun | New / modified tests needed | Reason |
| --- | --- | --- | --- | --- |
| | | | | |

## Risk Level

- Risk: Low / Medium / High
- Rationale:
- Historical defects considered:

## Selected Regression Tests

| Test / suite | Layer | Why selected | Command | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| | Unit / API/integration / E2E / runtime | | | PASS / FAIL / BLOCKED | |

## Tests Not Run / Blockers

| Test / scope | Reason not run | Exact blocker | Owner action | Residual risk |
| --- | --- | --- | --- | --- |
| | BLOCKED / Not applicable | | | |

## Runtime QA Validation

Use only when startup, routing, configuration, deployment, or environment availability is part of the regression risk.

| Needed? | Reason | Operation | Result | Evidence |
| --- | --- | --- | --- | --- |
| Yes / No | | | PASS / FAIL / BLOCKED | |

## Regression Conclusion

- Overall result: PASS / FAIL / BLOCKED
- Changed behavior covered:
- Directly impacted old behavior covered:
- Requirement-driven test changes:
- Uncovered test points:
- Unresolved prerequisite blockers:
- Remaining risks:

## Short Example

Delete this section or replace it with project-specific rows before finalizing the artifact.

| Changed item | Impacted existing behavior | Existing tests to rerun | New / modified tests needed | Reason |
| --- | --- | --- | --- | --- |
| Discount approval API | Existing pending and approved discount state transitions | `DiscountApprovalApiTest` | Add denied approval for non-owner manager | Shared workflow state and authorization boundary changed |
