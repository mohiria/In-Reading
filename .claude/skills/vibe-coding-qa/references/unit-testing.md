# Unit Testing

Use this reference after lightweight test design identifies unit-level or component-level test points. Unit tests are the first executable control for AI-generated code because they are fast, local, and precise.

Use the project's existing test framework and runner first. If no convention exists, consult `references/test-tooling.md`.

## Goal

Unit testing verifies one behavior boundary at a time:

```text
Spec rule / code path / historical defect
-> Red test
-> minimum implementation
-> refactor with tests passing
-> coverage artifact updated
```

Unit tests should prove business rules, validation, branching, state transitions, formatting, pure calculations, component logic, and error handling without requiring a full service or browser environment.

## When To Use Unit Tests

Prefer unit tests when the expected behavior can be proven inside a local code boundary:

| Target | Examples |
| --- | --- |
| Business rules | Pricing, eligibility, approval decisions, status transitions. |
| Validation | Required fields, length, range, enum, format, cross-field rules. |
| Permission decisions | Role checks, ownership checks, feature-flag decisions. |
| Data transformation | Mapping, serialization, normalization, sorting, grouping. |
| Error handling | Invalid input, missing dependency result, timeout branch, fallback branch. |
| Frontend logic | Reducers, hooks, component state, form validation, disabled/enabled rules. |
| Historical defects | Reproduction of a bug before fixing it. |

Do not use a unit test when correctness depends on real persistence, routing, authentication middleware, database constraints, or external service contracts. Use API/integration tests for those boundaries.

## Required Inputs

Before writing a unit test, collect:

- The lightweight test design row for the test point.
- The expected behavior authority: active requirement, API contract, data rule, existing behavior baseline, code path, risk, historical defect, or explicit clarification.
- The smallest production unit that owns the rule.
- Existing test layout, naming conventions, fixtures, factories, and assertion style.
- Required dependency seams, mocks, stubs, realistic synthetic data, or minimal technical data when the assertion has no business meaning.

If the expected behavior is unclear or conflicts with the existing behavior baseline, use the Requirement Conflict Gate before changing tests or production code. Do not turn the current implementation into the expected behavior by default.

## TDD Workflow

Use strict Red-Green-Refactor for unit tests whenever behavior can be tested before implementation.

1. Select one in-scope executable test point from the lightweight design.
2. Find the smallest existing test file or create the smallest conventional test file.
3. Write the Red test with a meaningful name and assertion.
4. Run only the new or directly relevant test and confirm it fails for the expected behavior reason, not because of syntax, import, setup, fixture, or environment failure.
5. Implement the minimum production change needed to pass.
6. Rerun the new or modified test.
7. Run directly affected existing unit tests.
8. Refactor only with tests passing.
9. Update `Coverage artifact` with the project-root relative test path and optional `#testName`.

If the Red test cannot be created or executed because a prerequisite is missing, follow `qa-constitution.md` §Test Data Rules to create deterministic data before reporting a blocker.

## Test Design Rules

Each generated unit test must have:

- A traceable source.
- A single clear purpose.
- Explicit input or precondition.
- Observable expected result.
- A meaningful assertion target.
- Deterministic data.
- Isolation from unrelated infrastructure.

Use these design methods:

| Method | Unit testing use |
| --- | --- |
| Equivalence partitioning | One valid class and representative invalid classes. |
| Boundary value analysis | Minimum, maximum, just below, just above, empty, single item, many items. |
| Decision table | Combinations of roles, flags, statuses, and field values. |
| State transition | Allowed and rejected status changes. |
| Branch coverage | Important if/else and guard paths. |
| Exception path coverage | Expected thrown error, returned error object, or fallback behavior. |
| Regression reproduction | Failing test that captures the historical defect before the fix. |

Do not generate many low-value tests only to increase line coverage. Prefer fewer tests with strong behavioral assertions.

## Assertion Standards

Assertions must verify behavior, not implementation trivia.

Good assertion targets:

- Returned value or normalized object.
- Domain error code and message key.
- State transition result.
- Emitted event or callback payload.
- Repository or gateway call arguments when the call is the behavior boundary.
- Component-visible state, validation message, disabled state, or submitted payload.

Weak assertions are not enough:

- Only asserting that a function does not throw.
- Only asserting that a mock was called without checking the meaningful payload.
- Snapshot-only assertions for business logic.
- Repeating the implementation expression inside the expected value.
- Checking private implementation details when public behavior is available.

## Mocking Rules

Mock only dependencies outside the unit boundary. Do not mock the behavior being tested.

Allowed:

- Repository, gateway, clock, UUID, filesystem, network, queue, and analytics boundaries.
- Expensive or nondeterministic collaborators.
- External service clients when contract behavior is covered elsewhere.

Avoid:

- Mocking validators while testing validation behavior.
- Mocking the service method under test.
- Over-mocking every collaborator until the test only verifies wiring.
- Using mocks to hide missing test data or unclear requirements.

Prefer real lightweight value objects, factories, or in-memory fakes when they make the test more representative without adding flakiness.

## Test Data Setup

Test data rules are canonical in `qa-constitution.md` §Test Data Rules; generation techniques are in `references/test-data-and-simulation.md`. Unit-specific setup order:

1. Existing project factory, builder, fixture, or test helper.
2. Inline minimal realistic synthetic data when the shape is simple and stable.
3. In-memory fake for repositories, clocks, IDs, gateways, or external collaborators.
4. A documented blocker only when the required rule, dependency contract, or safe synthetic data shape is unclear.

Unit tests are where the minimal-data exception applies: use plausible domain values when meaning matters (business rules, state transitions, permission decisions, business-facing formatters, payload mapping), and minimal synthetic values only for pure technical boundaries when the test design records why business realism cannot affect the result.

## Frontend Unit And Component Tests

Use unit or component tests for UI behavior that does not require a full browser journey:

- Form validation.
- Conditional rendering.
- Disabled/enabled states.
- Hook and reducer behavior.
- Error, empty, loading, and success states.
- Mapping API data into view models.
- Submitting the correct payload to a mocked boundary.

Do not move every UI rule to E2E. Use E2E for user workflows that need integration confidence.

## Coverage Closure

After creating or modifying unit tests:

1. Run the new or modified unit tests.
2. Run directly affected existing unit tests.
3. Record the command and result as evidence.
4. Update the lightweight design `Coverage artifact` per `qa-constitution.md` §Coverage Artifact Format.
5. List uncovered unit-level test points and unresolved prerequisite blockers.

Runtime QA validation is not unit coverage (see `qa-constitution.md` §Runtime QA Validation Rule).

## Review Checklist

Before accepting unit tests, verify:

- The tests trace to lightweight test design rows.
- Red tests were run before implementation when strict TDD applies.
- Test names describe behavior, not only method names.
- Assertions prove the expected result.
- Normal, invalid, boundary, permission, and state cases are covered when relevant.
- Mocks are limited to dependencies outside the unit boundary.
- No assertions were weakened to pass the suite.
- New, modified, and directly affected tests were executed.
- Coverage artifacts were updated after execution.
- Remaining uncovered test points and unresolved prerequisite blockers are explicit.
- Test data follows `qa-constitution.md` §Test Data Rules (minimal-data exception documented where used; missing data not treated as a blocker when it could be created).
