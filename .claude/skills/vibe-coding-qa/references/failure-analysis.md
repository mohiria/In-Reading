# Failure Analysis

Use this reference when a local test, CI test, runtime validation, or QA check fails. Failure analysis must happen before changing code, tests, fixtures, or expected results.

## Goal

Failure analysis turns a failing signal into a classified action:

```text
failure evidence
-> reproduce or inspect
-> classify root cause
-> choose repair action
-> rerun affected tests
-> add missing coverage when needed
```

Do not blindly retry, weaken assertions, skip failing tests, or change expected behavior to match the current implementation.

## Required Evidence

Collect enough evidence to classify the failure:

- Test name, file, suite, or CI job.
- Command or workflow that failed.
- Failure output, stack trace, diff, response body, screenshot, trace, log, or report.
- Recent code, test, fixture, dependency, config, or environment changes.
- Whether the failure is new, historical, flaky, or already known.
- Whether the failure reproduces locally or only in CI.

If evidence is missing, gather it before editing. If access to logs, artifacts, credentials, services, or CI is blocked, report the exact blocker.

## Failure Classification

The failure-type summary is canonical in `qa-constitution.md` §Failure Handling. This section adds the signals and actions per type. Classify the failure before taking action.

| Failure type | Signals | Action |
| --- | --- | --- |
| Code implementation problem | Test expectation matches active requirement authority or confirmed baseline behavior, implementation violates it. | Fix production code, rerun affected tests, add missing coverage if needed. |
| Test design problem | Test expectation conflicts with active requirement authority, asserts the wrong behavior, or targets the wrong boundary. | Fix the test and document why the old test was wrong. |
| Requirement change | Active requirement authority intentionally changed expected behavior. | Update tests per requirement change handling and run regression for old behavior that remains supported. |
| Test data problem | Missing seed, stale fixture, shared mutable data, cleanup failure, order dependency. | Fix setup, isolation, fixture, factory, or cleanup. |
| Environment problem | Missing service, port conflict, credential, plugin, browser, database, config, network, or deployment issue. | Fix or report environment blocker; do not change assertions. |
| Dependency or integration problem | External service, package, container, queue, cache, or contract changed unexpectedly. | Classify as environment, integration contract, or production code issue; capture evidence. |
| Flaky test | Non-deterministic timing, race, ordering, animation, clock, random data, or intermittent infrastructure. | Diagnose root cause; quarantine only with explicit tracking and repair plan. |
| Requirement ambiguity | Multiple plausible expected behaviors. | Stop and request clarification before changing expected behavior. |

If multiple categories apply, choose the category that explains the first failing cause, then retest after repair.

## Decision Rules

Use these rules before editing:

- If active requirement authority is clear and the test is meaningful, fix code.
- If the active requirement changed, update tests only with the requirement source and regression impact.
- If the test is wrong, fix the test and state why.
- If setup is wrong, fix data or environment setup, not assertions.
- If the failure is flaky, identify the nondeterministic cause before adding waits or retries.
- If expected behavior is ambiguous or authority conflicts with the existing behavior baseline, use the Requirement Conflict Gate before changing tests or production code.

Never:

- Remove assertions to pass.
- Skip or delete a failing test without documented justification.
- Change expected values to match a buggy implementation.
- Replace deterministic assertions with snapshots only.
- Claim a retry solved the issue without explaining why retry was valid.

## Retry Policy

Retries are acceptable only after classification.

Valid retry reasons:

- Known infrastructure interruption.
- Network or CI worker failure unrelated to product behavior.
- External sandbox outage.
- Runner timeout with evidence that the test did not reach the assertion.

Invalid retry reasons:

- Unknown failure.
- Assertion mismatch.
- Permission or data mutation failure.
- Flaky behavior without diagnosis.
- Hoping the suite passes on another attempt.

If retry passes, still record the original failure and why retry was reasonable when reporting QA evidence.

## Repair And Rerun

After a repair:

1. Rerun the failing test.
2. Rerun directly affected tests at the same layer.
3. Rerun lower-layer tests if the fix touched shared logic.
4. Rerun regression tests based on impact and risk.
5. Add or update coverage if the failure exposed an uncovered rule, branch, contract, state, or historical defect.
6. Update coverage artifacts when new or modified tests are created and executed.

If the repair changes a test, state the reason using the allowed categories from the QA Constitution.

## Failure Learning

After classifying and repairing a failure, decide whether the lesson should be preserved for future QA and coding work.

Record a learning when:

- The same mistake is likely to recur.
- The failure exposed a missing test design pattern.
- AI-generated code is likely to repeat the defect.
- The root cause involved hidden business rules, permissions, state transitions, async behavior, test data, environment setup, or integration contracts.
- The failure was expensive to diagnose and has clear future diagnostic signals.

A learning should capture:

- Symptom: how the issue appeared.
- Root cause: the actual reason it failed.
- Fast diagnosis signal: log, error shape, assertion diff, trace, or code pattern.
- Correct fix pattern.
- Test reinforcement: unit, API/integration, E2E, regression, or runtime validation follow-up.
- Future trigger: when this learning should be checked again.

Do not store project-specific learnings inside this skill repository. Use the project's chosen knowledge location, such as a project QA notes file, issue, wiki, or team knowledge base. If no location exists, include the learning in the QA output and recommend where the project should keep it.

Do not record secrets, real user data, credentials, full logs with sensitive data, or one-off noise that has no future diagnostic value.

## Reporting

A failure analysis report should include:

- Failure summary.
- Evidence used for classification.
- Failure type.
- Root cause or current best explanation.
- Code, test, data, environment, or requirement action taken.
- Tests rerun and results.
- Coverage added or updated.
- Failure learning recorded or recommended, if the issue is likely to recur.
- Remaining risks and unresolved prerequisite blockers.

## Review Checklist

Before accepting failure handling, verify:

- Evidence was gathered before editing.
- The failure type was classified.
- Expected behavior was traced to active requirement authority, existing behavior baseline, or explicit clarification as appropriate.
- Tests were not weakened, skipped, or deleted to pass.
- Changed tests have documented justification.
- Flaky failures have a root-cause hypothesis or repair plan.
- Affected tests and regression scope were rerun.
- Missing coverage found by the failure was added or explicitly listed as uncovered.
- Recurring or high-diagnosis-cost failures were converted into a project learning or explicit recommendation.
