# Runtime QA Validation

Use this reference when a real running app, service, CLI, or deployment must prove basic availability. Runtime QA validation is evidence-based smoke validation; it is not business test coverage and does not replace unit, API/integration, or E2E tests.

## Goal

Runtime QA validation proves that the current runtime environment is usable:

```text
prerequisites
-> start or locate running service
-> wait for ready signal
-> perform one real operation
-> capture evidence
-> decide PASS / FAIL / BLOCKED
-> cleanup
```

Use it to reduce environment and deployment risk, not to validate every business rule.

## When To Use Runtime Validation

Use runtime validation when availability risk matters:

| Situation | Runtime validation focus |
| --- | --- |
| Before merge or release for high-risk changes | Service starts, key route/API/CLI path is reachable. |
| After deployment or environment change | Deployment responds with expected health and basic operation. |
| Config, auth, routing, or integration changed | Environment wiring is present and usable. |
| Automated tests pass but real availability is uncertain | Confirm the app can run in the target-like environment. |
| Regression risk includes environment startup | Capture startup, readiness, and smoke evidence. |

Do not run runtime validation as a substitute for missing automated tests. If a business rule needs coverage, create or request Unit/API/E2E tests at the proper layer.

## Required Inputs

Before validating runtime behavior, collect:

- Target environment: local, preview, staging, production-like, or CI artifact.
- Startup command or existing service URL.
- Readiness signal: health endpoint, log line, port, process, page, or CLI response.
- Required environment variables, credentials, test account, plugin, browser, database, or service dependency.
- One minimal smoke operation and expected evidence.
- Cleanup action for created data, processes, files, sessions, or ports.

If a prerequisite is missing, report the exact blocker and resume only after the human confirms it is resolved.

## Validation Flow

Follow this sequence:

1. State why runtime validation is needed.
2. Check prerequisites without exposing secrets.
3. Start the service or identify the running target.
4. Wait for a concrete ready signal.
5. Perform a real API, CLI, browser, or health operation.
6. Capture evidence: command output, response body, logs, screenshot, trace, report, or CI URL.
7. Decide `PASS`, `FAIL`, or `BLOCKED`.
8. Clean up resources created by the validation.
9. Report what runtime validation does and does not cover.

Avoid fixed sleeps when a concrete readiness signal exists. Prefer deterministic health checks, web-first assertions, process status, or explicit logs.

## Evidence Standards

Runtime validation conclusions must cite evidence.

Good evidence:

- Startup command and ready log line.
- Health endpoint response and status.
- API smoke response body.
- Browser screenshot or trace for a reachable critical page.
- CLI command output.
- CI run URL or report path.
- Relevant application logs.

Weak evidence:

- "Looks fine" without artifact.
- Only noting that a command was attempted.
- A screenshot without saying what it proves.
- A health check claimed as business rule coverage.

## PASS / FAIL / BLOCKED

Use these outcomes:

| Outcome | Meaning |
| --- | --- |
| PASS | Prerequisites were available, runtime target responded, smoke operation matched expected evidence, and cleanup completed or was unnecessary. |
| FAIL | The runtime target was reachable enough to test, but startup, readiness, operation, assertion, or cleanup failed. |
| BLOCKED | A required prerequisite is missing: credential, account, service, plugin, database, port, browser, deploy URL, or permission. |

For `FAIL`, classify whether the issue is code, config, environment, data, dependency, or test script before changing anything. For `BLOCKED`, list the exact missing prerequisite and owner action needed.

## Boundary With Automated Testing

Runtime validation can support QA but does not close business coverage:

- It can prove service startup, routing, login reachability, CLI availability, and deployment health.
- It cannot replace unit tests for business rules.
- It cannot replace API/integration tests for contracts, authorization, persistence, or data consistency.
- It cannot replace E2E tests for user workflows with assertions.
- It should be reported separately from Unit/API/E2E coverage artifacts.

If runtime validation discovers a business defect, create or request an automated test at the lowest effective layer after classifying the failure.

## Cleanup

Cleanup is required when runtime validation creates state:

- Stop local services started only for validation.
- Delete test records, uploaded files, generated reports, or queued jobs when safe.
- Close browser contexts or sessions.
- Free ports and temporary files.
- Document residual data if cleanup is not possible.

Never run destructive cleanup against production data. If cleanup is unsafe, report the residual risk instead.

## Report Format

A runtime validation report should include:

- Target environment or URL.
- Reason runtime validation was required.
- Prerequisites checked.
- Operation performed.
- Evidence captured.
- Result: `PASS`, `FAIL`, or `BLOCKED`.
- Cleanup performed or residual data risk.
- Explicit statement that runtime validation is not Unit/API/E2E business coverage.

## Review Checklist

Before accepting runtime validation, verify:

- Runtime validation was actually needed for environment or deployment risk.
- Required prerequisites were checked.
- A concrete readiness signal was used.
- A real smoke operation was performed.
- Evidence supports the conclusion.
- `PASS`, `FAIL`, or `BLOCKED` is stated clearly.
- Missing prerequisites are exact when blocked.
- Cleanup or residual risk is documented.
- Runtime validation is not counted as business test coverage.
- Any business defect found is linked back to required automated test coverage.
