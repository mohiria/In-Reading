# QA Constitution

This document defines the mandatory QA rules for Vibe Coding work. Other QA references may add detail, but they must not weaken these rules.

## Position

Testing in Vibe Coding is not a final manual check after AI writes code. Testing is the control system for AI-generated software:

1. Active requirement authority defines the expected behavior.
2. TDD constrains implementation.
3. Layered tests provide repeatable verification.
4. Regression protects existing behavior.
5. Runtime QA validation proves the current environment is available when that risk matters.

The default sequence is:

```text
Test analysis and lightweight design
-> initial regression impact
-> unit tests
-> API/integration tests
-> E2E scenarios and tests
-> update regression scope from actual diff
-> coverage closure
-> runtime QA validation when needed
-> failure analysis and test reinforcement
```

## Mandatory TDD Rule

TDD is the organizing principle for QA work in this skill.

Use strict Red-Green-Refactor for behavior that can be tested before implementation:

```text
Red: create or select a test that should fail before the behavior exists
Green: implement the minimum behavior needed to pass
Refactor: improve the implementation while keeping the tests passing
```

Apply strict TDD to:

- Core business rules.
- Field validation.
- Permission and role checks.
- State transitions.
- API contracts.
- Data consistency logic.
- Error handling.
- Historical defect fixes.

Use TDD when practical for:

- Frontend component logic.
- Form interaction rules.
- Complex query/filter/sort logic.
- Import/export rules.
- Approval or workflow transitions.

Do not force strict TDD for:

- Pure style changes.
- Static copy changes.
- Low-risk display-only pages.
- One-time migration or maintenance scripts.
- E2E flows when the UI or service cannot be run yet.

For E2E work, use scenario-first design instead of mandatory Red-Green. Enumerate the in-scope user workflows first, then define the user role, preconditions, operation path, assertions, data setup, and cleanup before implementation or script generation.

Before changing production code, the agent must confirm one of the following:

- A valid Red test was created or selected and failed for the expected behavior reason.
- An existing failing test already proves the required behavior gap.
- Strict TDD does not apply, with the reason, alternative validation, and residual risk recorded.
- A prerequisite blocker prevents the Red test, with the exact missing dependency, account, service, permission, environment variable, plugin, unsafe data setup path, or test framework reported.

Syntax errors, import errors, test setup failures, fixture failures, missing dependencies, or environment failures do not count as valid Red evidence. They must be classified and fixed or reported before the Red phase can be considered complete.

### Red In Statically Typed Languages

In statically typed languages such as Java, Kotlin, TypeScript, Go, or C#, a test that references a missing method, class, route handler, mapper, controller, or endpoint may fail to compile before it can execute an assertion. A compile failure is not Red evidence. It means the minimal compilable stub step was skipped.

Use this sequence when the target symbol does not exist yet:

1. Create the smallest compilable production stub with the intended public signature or route. The stub may return `null`, throw `UnsupportedOperationException`, return an empty value, or return a placeholder response. Do not implement the real behavior.
2. Write or select the Red test against that signature or route.
3. Run the test and capture an assertion-level behavior failure, such as wrong status code, missing response field, empty result, or `expected approved got pending`.
4. Implement the minimum behavior needed to make the assertion pass.

Do not record compile errors, missing symbols, `NoSuchMethod`, `method not found`, `class not found`, `endpoint not found because no route exists`, import errors, fixture failures, environment failures, or database connection failures as Red evidence. Those are blockers or setup failures until the test can run and fail on behavior.

Test data for Red tests and all other tests must follow the canonical `## Test Data Rules` below.

## Test Data Rules

This is the canonical source for all test data rules. Other references and templates must not restate these rules; they may only add layer-specific evidence detail and point here. Techniques for generating realistic data live in `references/test-data-and-simulation.md`.

Missing ready-made seed data is not enough to claim a blocker. When local services, backend APIs, fixtures, factories, seed scripts, or a safe test database are available, the agent must prepare deterministic test data before execution. Report a blocker only when data cannot be created safely, required rules are unclear, or an external prerequisite is unavailable.

Use this default setup order: existing fixture/factory/builder/helper -> backend API setup -> project-approved seed script -> isolated test database, transaction, or container -> safe test database helper. Report a data blocker only when none of these can create the required state safely.

Test data must be realistic synthetic business data when the assertion depends on business meaning. It should look like data a real user, tenant, system process, or business workflow could create in the product domain, with plausible names, dates, amounts, statuses, ownership, permissions, and relationships that do not contradict each other. Unit tests for pure technical boundaries, simple formatters, mappers, or non-business assertions may use minimal synthetic data when the exception is recorded and business realism cannot affect the assertion. API/integration and E2E tests must keep realistic synthetic business data; the unit-level minimal-data exception does not apply to them. Do not use obvious placeholders such as `foo`, `bar`, `test123`, `asdf`, `张三`, `Acme Inc.`, or meaningless lorem text for business-facing records. Never use production data, real personal data, or real secrets.

### Generate From Requirement, Scenario, And Project Domain

Before generating any business-facing test data, derive it from three inputs and keep them coherent. Do not invent values detached from the product. This procedure applies to business-facing data at every layer; the unit-level minimal-data exception above is unchanged.

1. **Requirement**: the active Spec, rule, or contract the test must exercise. Put the entity in the exact state the requirement describes — for a permission-denial test, a persona that genuinely lacks the permission acting on a record actually in the required lifecycle state — not an arbitrary state that merely happens to pass.
2. **Usage scenario**: the real persona, role, entry point, and workflow the test represents. Values must reflect that scenario; an enterprise renewal, a trial signup, and an admin bulk action produce visibly different data.
3. **Project domain reality**: read the project's actual schema fields, allowed enum values, existing factories/fixtures, real sample records, primary language, and locale, then pick values from the project's real allowed set. Extend an existing factory or persona rather than inventing a parallel shape.

Business-facing data is realistic only when it meets this rubric:

- Text is written in the business system's primary language and locale: names, addresses, company names, descriptions, and free text use the product's actual user language (a Chinese product uses predominantly Chinese data, an English product English, and so on). Data in the wrong language is not realistic even if otherwise plausible.
- Identities are domain-plausible for the product's users, not generic placeholders.
- Amounts, dates, codes, and quantities carry business meaning; they are not round, sequential, or placeholder values chosen for convenience.
- Relationships, ownership, tenant, permission, and lifecycle dates are mutually consistent and match the requirement state and scenario.
- Each record is uniquely identifiable through a stable test prefix plus sequence so it can be isolated and cleaned up.

Shallow data that satisfies the wording of a field but not the rubric is not realistic. Beyond the obvious placeholders above, reject convenience values in any language — for an English product `Test User`, `John Doe`/`Jane Doe`, `example.com` addresses, sequential `user1@`/`test@` identities, `Product 1`/`Item 1`, and placeholder integer amounts; for a Chinese product the equivalents `测试用户`/`张三`/`李四`/`测试公司` and the like. Data written in the wrong language for the product (for example English records in a Chinese system) is itself a shallow-data failure. The rubric governs; these lists are illustrative, not exhaustive.

API/integration and E2E test data evidence must explain why the data is business-realistic. For API/integration, cite the API contract, permission state, lifecycle, tenant or ownership boundary, persistence rule, state transition, or business relationship being exercised. For E2E, cite the persona, entry point, workflow, lifecycle state, permission, tenant or ownership context, and visible business result. Generic statements such as "test data ready" or placeholder-looking records are invalid for API/integration and E2E coverage.

## Coverage Artifact Format

This is the canonical source for coverage-artifact format. Other references must point here instead of restating it.

`Coverage artifact` records the automated test that covers a test point. Use a project-root relative path with an optional `#testName`, for example `backend/src/test/java/com/acme/entity/EntityValidatorTest.java#shouldRejectEmptyName` or `frontend/tests/e2e/entity-permission.spec.ts`. Do not use absolute local machine paths. It may be empty during initial analysis; fill it after the test is created and executed, and keep it aligned through Green and Refactor. Commands are supporting execution evidence only, except when no stable file path exists, in which case record the command and test selector (for example `mvn test -Dtest=EntityApiTest#shouldRejectMissingName`).

## Requirement Authority And Conflict Rule

Expected behavior must come from the best available authority, not blindly from either old Spec documents or the current implementation.

For new or explicitly changed behavior, active Spec, PRD, issue, acceptance criteria, API contract, or explicit user confirmation is the primary expectation source.

For already implemented behavior, existing tests, current business code, public API contracts, database constraints, migrations, old Specs, and production-compatible behavior form the existing behavior baseline. This baseline describes what the system currently does and what existing tests protect. It is important evidence, but it is not automatically correct forever.

When an active requirement touches behavior that already has a baseline, classify the relationship before changing tests or production code:

| Relationship | Meaning | Required action |
| --- | --- | --- |
| `extends` | Adds new behavior without changing existing behavior. | Preserve existing tests and add new test points or tests. |
| `amends` | Partially changes existing behavior. | Modify affected tests only with the new authority recorded; keep unaffected old behavior covered. |
| `supersedes` | Explicitly replaces existing behavior. | Replace or retire affected tests only with the replacement authority and remaining coverage recorded. |
| `conflicts` | New requirement, old Spec, existing tests, code, API contract, or data model disagree without clear authority. | Stop changing expectations, tests, or production code; request clarification or cite a clear decision before continuing. |

This is the Requirement Conflict Gate. It must trigger before extracting new test points for changed existing behavior, before modifying or deleting existing tests, before changing production code to match a new expectation, and when a failing test may indicate a requirement change instead of an implementation defect.

If the gate finds `conflicts`, the agent may continue read-only analysis, list candidate interpretations, and propose options, but must not change expected behavior, modify or delete tests, or change production code for the disputed behavior until explicit authority is available.

## Test Design Before Scripts

AI must perform lightweight test design before generating test scripts.

For small behavior changes, the lightweight design may be minimal and embedded in the working notes or QA output, but it must still record the requirement source, representative test point, TDD Red evidence or documented exception/blocker, and initial regression impact.

Test points should be representative, not mechanically exhaustive. Use equivalence partitioning, boundary value analysis, decision tables, state transition testing, user workflow analysis, and risk signals to decide the in-scope executable set. Once a test point is in scope and executable, it must be attempted, explicitly blocked, or marked not applicable with a reason.

A test script is invalid if it does not have:

- A clear test purpose.
- An input or precondition.
- An expected result.
- A meaningful assertion target.
- A traceable source such as Spec, test point, code path, API contract, risk, or historical defect.

Do not generate tests directly from implementation code alone. Use implementation code to find missing branches, risks, and the existing behavior baseline, but use the best available requirement authority to decide expected behavior. If requirement authority and implementation disagree, apply the Requirement Conflict Gate.

The lightweight design must include initial regression impact for changed behavior. This does not replace later diff-based regression review; it records expected old behavior, old tests, historical defects, and affected workflows that must remain covered while TDD drives the new behavior.

## Mixed Testing Method

Vibe Coding QA is not pure black-box testing. AI can inspect requirements, data models, API contracts, code, tests, and change history.

Use a mixed method:

| Method | Use |
| --- | --- |
| Black-box testing | Derive scenarios from Spec, acceptance criteria, user roles, and user flows. |
| White-box testing | Derive unit tests from code branches, conditions, paths, exceptions, and state transitions. |
| Gray-box testing | Derive API/integration tests from API contracts, database constraints, permissions, and service interactions. |
| Risk-based testing | Decide regression scope from code diff, impacted modules, dependencies, critical paths, and historical defects. |
| Evidence-based validation | Confirm runtime behavior with command output, logs, responses, screenshots, traces, and reports. |

Code visibility must improve coverage, not replace user-oriented validation. Do not write tests that only preserve the current implementation if the implementation conflicts with active requirement authority. If authority is unclear, apply the Requirement Conflict Gate.

## Layered Testing

Prefer the lowest effective test layer.

```text
Unit -> API/Integration -> E2E
```

| Layer | Primary purpose | Typical target |
| --- | --- | --- |
| Unit | Verify local rules and logic quickly. | Functions, methods, services, validators, reducers, component logic. |
| API/Integration | Verify service contracts and connected behavior. | Controllers, endpoints, auth, DB writes, service integration, external-service boundaries. |
| E2E | Verify in-scope user workflows across boundaries. | Login, create/edit/search/approve/submit flows, cross-page behavior, role-specific paths, state and permission workflows. |
Do not push every scenario into E2E. If a rule can be verified reliably with a unit or API/integration test, prefer that lower layer.

E2E should cover user workflows, not every implementation detail. Cover the workflows a user can take through the product, including important role, permission, lifecycle, empty, error, and recovery states. Keep detailed field combinations, API error variants, and pure logic at lower layers unless they are visible workflow risks.

## Required Execution Rules

Before submitting or declaring work complete:

- Run all newly added tests.
- Run all modified tests.
- Run directly affected existing tests.
- Run additional regression tests based on impact and risk.
- Merge planned design coverage and regression coverage into one execution scope. If the lightweight test design, its regression impact section, or a separate regression impact analysis names an in-scope executable item, that item must be executed, explicitly blocked, or marked not applicable with a reason.
- Close coverage for in-scope executable test points by recording coverage artifacts. If prerequisites are missing, report the exact blocker to the human owner, resume after the human confirms it is resolved, then execute.
- Report any tests that could not be run and explain why.
- Generate or update `qa-test-report` for any QA cycle that executed tests, created or modified tests, performed regression, API/integration, E2E, runtime validation, or failure analysis. If the report cannot be produced, record the exact blocker, alternative evidence, and remaining risk.

Before reporting a test as not run because of missing data, follow the setup order and realism requirements in `## Test Data Rules`.

If an existing test is modified, state the reason:

1. The active requirement changed.
2. The expected behavior intentionally changed.
3. The old test was incorrect.
4. The old test was flaky and is being fixed.
5. Test data or environment changed.

Changing a test is never enough by itself. The agent must also confirm the updated test still has a clear purpose, meaningful assertions, and traceability.

Deleting or retiring a test is allowed only when the active requirement authority explicitly removes or replaces the behavior, or when equal or better coverage remains elsewhere. The agent must document the requirement source, the baseline behavior being changed, and remaining coverage.

## Regression Rule

Regression testing asks whether this change broke existing behavior.

Initial regression impact belongs in the lightweight test design so TDD planning considers old behavior while defining Red tests and E2E scenarios. Create a separate regression impact analysis only when the regression scope is complex enough to need independent review, such as high-risk changes, cross-module changes, requirement changes that amend or supersede existing behavior, modified/deleted tests, large fixture/helper changes, or release-critical validation.

Use this default selection:

| Risk | Required regression |
| --- | --- |
| Low | Related unit tests and local API/integration tests. |
| Medium | Related unit tests, API/integration tests, and affected E2E user workflows when user-visible. |
| High | Module-level regression, affected/core E2E user workflows, and runtime QA validation if environment risk exists. |

Always include historical defect tests when the change touches the same behavior, field, endpoint, state, or user flow.

Scheduled full regression may cover unrelated old behavior, but directly impacted old behavior must be validated before completion.

## Runtime QA Validation Rule

Runtime QA validation is not business test coverage and is not a replacement for unit, API, or E2E tests.

Use it when a real environment must prove current usability:

- Before merge or release for high-risk changes.
- After deployment or environment changes.
- When service startup, configuration, authentication, routing, or integration is risky.
- When automated tests pass but real availability is uncertain.

Runtime validation should be a minimal evidence-based smoke check:

```text
Prerequisites
-> start service
-> wait for ready signal
-> perform real API, CLI, or browser operation
-> capture evidence
-> decide PASS / FAIL / BLOCKED
-> cleanup
```

## Anti-Fake-Test Policy

The following are forbidden:

- Tests that only assert that code "does not throw" when specific behavior should be checked.
- Tests that use meaningless placeholder business data where realistic synthetic data is required.
- API tests that only assert HTTP 200 without validating response body, error shape, or data state.
- E2E tests that only check that a page loads when a business result should be verified.
- Removing assertions to make tests pass.
- Skipping or deleting failing tests without documented justification.
- Replacing deterministic assertions with snapshots only.
- Testing mocks instead of the behavior under test.
- Over-mocking the unit so the test no longer validates real logic.
- Changing expected behavior to match a buggy implementation.
- Claiming tests passed without execution evidence.

## Failure Handling

When a test fails, classify the failure before changing anything:

| Failure type | Action |
| --- | --- |
| Code implementation problem | Fix code, rerun affected tests, and add missing coverage if needed. |
| Test design problem | Fix the test and explain why the old test was wrong. |
| Test data problem | Fix setup, isolation, cleanup, or seed data. |
| Environment problem | Fix or report configuration, dependency, service, port, credential, or deployment issue. |
| Requirement ambiguity | Stop and request clarification or update the requirement source before changing expected behavior. |
| Flaky test | Diagnose root cause; quarantine only with explicit tracking and repair plan. |

Do not blindly retry CI. A retry is acceptable only after classifying why retry is reasonable, such as known infrastructure interruption.

## Quality Gate

A change is not ready if:

- Required tests were not run.
- New or modified tests fail.
- Directly impacted old tests fail.
- Any in-scope executable test point has no coverage artifact after required prerequisites are available.
- Any in-scope E2E user workflow is left without scenario design or an explicit lower-layer-only justification.
- A failing test was skipped without documented justification.
- A test was weakened to match the implementation.
- The implementation has no test for a core business rule, API contract, permission rule, state transition, or historical defect.
- Runtime validation was required but no evidence was captured.

The final QA statement must include:

- Tests run.
- Tests not run and why.
- Failure analysis if anything failed.
- Regression scope.
- Uncovered test points and unresolved prerequisite blockers.
- Remaining risks.
- Evidence links or command/log snippets when available.
