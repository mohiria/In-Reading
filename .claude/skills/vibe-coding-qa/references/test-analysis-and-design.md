# Test Analysis and Design

Use this reference before generating or reviewing any test script. Its purpose is to decide what to test, why to test it, which layer should test it, and what assertions prove correctness.

## Goal

Vibe Coding QA must not jump from Spec directly to test code. AI must first create a lightweight test design that connects:

```text
Spec / PRD / data model / API contract / code change
-> test points
-> test design method
-> test layer
-> expected result
-> assertion target
-> initial regression impact
-> test script or validation action
```

This design can be brief, but it must exist. For small behavior changes, a minimal lightweight design is acceptable when it records the requirement source, representative test point, TDD Red evidence or exception/blocker, and initial regression impact. It replaces heavy traditional test-case management while preserving real testing discipline.

## Inputs

Collect or inspect the available inputs before designing tests:

- Spec, PRD, user story, or acceptance criteria.
- Data model, field rules, entity relationships, status definitions, and CRUD matrix.
- API contract, request/response schema, error code convention, auth rules, and integration boundaries.
- UI design, page states, component behavior, user roles, and user paths.
- User workflow inventory: personas, entry points, lifecycle states, permissions, normal paths, denial paths, recovery paths, and cleanup needs.
- Existing code, changed code, dependency graph, and configuration.
- Existing tests, historical defects, production incidents, and flaky areas.
- Test environment, test data, credentials, mocks, and CI constraints.

If a required input is missing and the missing information changes expected behavior, stop and ask for clarification. Do not invent business rules.

## Requirement Conflict Gate

Use this gate before extracting or changing test points for already implemented behavior. The full rule lives in `references/qa-constitution.md`; this section is a summary and must not weaken it.

1. Identify active requirement sources: Spec, PRD, issue, acceptance criteria, API contract, or explicit user confirmation.
2. Identify the existing behavior baseline: existing tests, current implementation, public API contract, data model, migrations, old Specs, and production-compatible behavior.
3. Classify the relationship between the active requirement and the baseline as `extends`, `amends`, `supersedes`, or `conflicts`.
4. If the relationship is `conflicts`, stop changing test expectations, tests, or production code for the disputed behavior and request clarification or cite a clear decision authority.

Use the active requirement as change authority only for explicitly changed behavior. Preserve existing behavior coverage unless the new authority clearly amends or supersedes it. When the relationship is `conflicts`, stop changing expected behavior, tests, and production code for the disputed behavior until explicit authority is available.

## Analysis Sources

Extract test points from multiple sources. Do not rely on only one source.

Test point selection should create representative coverage, not meaningless combination explosions. Use equivalence classes, boundaries, decision tables, state transitions, workflow paths, and risk signals to decide the in-scope executable set. Once selected, every in-scope executable test point must be attempted, explicitly blocked, or marked not applicable with a reason.

| Source         | What to extract                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Spec / PRD     | Business rules, user goals, acceptance criteria, in-scope and out-of-scope behavior.                    |
| Data model     | Required fields, unique constraints, enum values, length/range limits, relationships, lifecycle states. |
| CRUD matrix    | Create, read, update, delete, disable, archive, restore, pagination, filtering, sorting, permissions.   |
| API contract   | Method, path, request schema, response schema, status codes, error shape, auth, idempotency.            |
| UI design      | Initial/loading/empty/success/error states, form rules, disabled states, modal behavior, navigation.    |
| User workflow  | Persona, entry point, precondition data, operation path, state change, visible result, recovery path.   |
| Code structure | Branches, conditions, exceptions, state transitions, validators, side effects, integration calls.       |
| Change diff    | Directly changed behavior, dependent modules, shared utilities, impacted endpoints and pages.           |
| History        | Past bugs, flaky tests, high-risk modules, escaped defects, production incidents.                       |

## Mixed Design Method

The method-to-use summary table is canonical in `qa-constitution.md` §Mixed Testing Method. This section adds how to apply each method during design. Use black-box, white-box, gray-box, and risk-based methods together.

### Black-Box Design

Use when deriving behavior from Spec, user roles, or externally visible behavior.

Apply:

- Equivalence partitioning for valid and invalid input classes.
- Boundary value analysis for numeric, length, date, count, and range limits.
- Decision tables for combinations of rules, permissions, flags, or statuses.
- State transition testing for workflow status changes.
- Use-case and scenario testing for user journeys.
- Error guessing for common invalid, missing, duplicate, expired, or conflicting data.

### White-Box Design

Use when code is visible and the test layer is unit or component-level.

Apply:

- Branch and condition coverage.
- Path coverage for important paths, not every theoretical path.
- Exception path coverage.
- Loop and collection boundary coverage.
- State mutation coverage.
- Side-effect observation for events, persistence calls, or emitted outputs.

White-box analysis may reveal missing tests and the existing behavior baseline, but it must not redefine expected behavior. Active requirement authority owns changed expected behavior. If old Spec, new Spec, tests, and implementation disagree, use the Requirement Conflict Gate instead of guessing.

### Gray-Box Design

Use when testing APIs, services, databases, authorization, and integrations.

Apply:

- API contract validation.
- Database constraint validation.
- Permission matrix testing.
- Request/response schema checks.
- Data consistency checks before and after mutation.
- Integration boundary checks with mocks, stubs, containers, or test doubles.

### Risk-Based Design

Use when deciding priority and regression scope.

Increase priority when a test point involves:

- Revenue, compliance, security, or data loss.
- Authentication or authorization.
- Shared utilities or shared data model changes.
- State transitions and workflow approvals.
- Import/export, batch operations, async jobs, or external integrations.
- Historical defects.
- High user frequency.
- Hard-to-detect failures.

## Test Layer Decision

The layer purposes and the "lowest effective layer" rule are canonical in `qa-constitution.md` §Layered Testing. This section maps specific test points to layers. Choose the lowest effective layer.

| Test point                                                           | Default layer                   | Notes                                                                       |
| -------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Pure calculation, formatting, validation, branching, status decision | Unit                            | Best TDD target.                                                            |
| Service rule with repository or collaborator boundary                | Unit or integration             | Unit if dependencies can be isolated; integration if DB behavior matters.   |
| API request validation, auth, response shape, error code             | API/integration                 | Verify contract and observable service behavior.                            |
| Data persistence, uniqueness, transaction, query behavior            | API/integration                 | Use real or isolated test database when correctness depends on persistence. |
| Frontend component state, form validation, disabled/enabled rules    | Unit/component                  | Do not use E2E for every UI rule.                                           |
| User workflow across pages and services                              | E2E                             | Cover all in-scope user workflows at scenario level.                        |
| Cross-role or multi-user workflow                                    | E2E                             | Use isolated roles, profiles, and deterministic data.                       |
| Existing behavior affected by change                                 | Regression through Unit/API/E2E | Select old automated tests by impact and risk.                              |

If a test can be reliable at a lower layer, do not move it to E2E just because E2E is available.

E2E coverage means workflow coverage, not exhaustive rule coverage. Use E2E for each in-scope user workflow, including important role, permission, lifecycle, empty, error, and recovery states. Keep field-combination detail, API contract variants, and pure branching at unit or API/integration layers unless the variation changes a user-visible workflow.

## Lightweight Test Design Format

Create a compact design table before generating tests.

Required fields:

| Field                | Meaning                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test point           | What behavior, rule, risk, or path is being verified.                                                                                                                                                                                                                                                                                   |
| Source / authority   | Active requirement, data field, API contract, existing behavior baseline, code path, risk, historical defect, or explicit confirmation.                                                                                                                                                                                                  |
| Design method        | Equivalence class, boundary value, decision table, path coverage, state transition, etc.                                                                                                                                                                                                                                                |
| Test layer           | Unit, API/integration, or E2E. Regression reuses these layers based on impact.                                                                                                                                                                                                                                                          |
| Input / precondition | Input values, role, data state, environment state, or setup condition.                                                                                                                                                                                                                                                                  |
| Expected result      | Observable correct behavior.                                                                                                                                                                                                                                                                                                            |
| Assertion target     | Specific value, status, response field, DB state, UI state, log, or artifact to assert.                                                                                                                                                                                                                                                 |
| Priority             | P0, P1, P2, or P3.                                                                                                                                                                                                                                                                                                                      |
| Coverage artifact    | The automated test that covers this test point, formatted per `qa-constitution.md` §Coverage Artifact Format. May be empty during initial analysis; fill it after the test is created and executed. |

For changed existing behavior, also record the requirement relationship and decision authority in the QA report's `Requirement Authority / Conflict Review` section.

Also record initial regression impact in the lightweight design:

| Field | Meaning |
| --- | --- |
| Impacted existing behavior | Old behavior, workflow, API contract, data rule, permission rule, or historical defect that may be affected. |
| Existing tests to rerun | Known old tests or suites that should remain passing. |
| Regression risk | Low, Medium, or High based on blast radius and criticality. |
| Separate regression analysis needed? | `Yes` only for high-risk, cross-module, requirement-conflicting, heavily test-changing, or release-critical changes. |

Example only. Replace these rows with project-specific behavior. Use Chinese for project-specific test design content when the team works in Chinese. Keep code identifiers, API paths, enum values, field names, and test file names in their original form.

| Test point | Source / authority | Design method | Test layer | Input / precondition | Expected result | Assertion target | Priority | Coverage artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Entity name is required | Active field rule | Equivalence partitioning | Unit + API/integration | `name` is empty | Validation fails | Required-field error code and message | P0 | Initially empty; fill after execution, such as `backend/src/test/java/.../EntityValidatorTest.java#shouldRejectEmptyName` |
| User without delete permission cannot delete entity | Permission rule | Decision table | API/integration + E2E user workflow | Current role lacks delete permission | Delete is rejected and page cannot delete | HTTP 403; delete button hidden or disabled | P0 | Initially empty; fill after execution, such as `backend/src/test/java/.../EntityPermissionApiTest.java#shouldRejectDeleteWithoutPermission` |

## From Analysis to TDD

After lightweight design, identify TDD candidates.

Use strict Red-Green-Refactor for:

- Unit-level rules.
- API contract behavior that can be expressed before implementation.
- Integration behavior with stable test environment or test containers.
- Historical defect reproduction.

For each TDD candidate, record:

- Initial failing test name.
- Why it should fail before implementation, including the expected Red failure reason.
- Minimal behavior required to pass.
- Related Spec or rule.
- Regression tests that must remain passing.
- Existing behavior that may be affected and must be covered by regression execution.

Then close coverage for each in-scope executable TDD candidate:

1. Check whether an appropriate test file or test class already exists.
2. If it exists, add or update the smallest relevant test case.
3. If it does not exist, create the test file or class following the project's existing test layout and naming conventions.
4. Run the new or modified test before implementation and confirm it fails for the expected behavior reason, not because of syntax, import, fixture, environment, or setup errors.
5. If the test cannot be created or run because prerequisites are missing, report the blocker to the human owner with the exact missing dependency, environment variable, account, service, plugin, or permission. Resume only after the human confirms it is resolved, then create/run the test and continue coverage closure.
6. After the Red test exists and has been executed, update `Coverage artifact` with the project-root relative path and optional test class/method or test name. Record the command as supporting evidence when useful.
7. Continue with Green and Refactor, then keep `Coverage artifact` aligned with the final code.

Do not create arbitrary new test locations. Follow the current repository conventions first. If no convention exists, place the test near the target code or in the standard test root for the stack, and document the choice.

For E2E, record scenario-first design:

- Persona or role.
- Preconditions and test data.
- User path.
- Critical assertions.
- Cleanup strategy.
- Evidence to capture on failure.

For E2E, `Coverage artifact` may remain empty during scenario design. After a browser E2E test exists, update it with the project-root relative path. Scenario-first design is valid even before the E2E test file exists.

## User Scenario Matrix

Build the user scenario matrix before deciding E2E scope. Include every in-scope workflow a real user can perform through the product surface affected by the change.

Use these dimensions:

- Persona, role, permission, tenant, ownership, or account state.
- Entry point, deep link, navigation path, modal, wizard, or cross-page flow.
- Data state: empty, existing, duplicate, archived, disabled, deleted, submitted, approved, rejected, expired, or locked.
- Operation: create, read, update, delete, disable, archive, restore, search, filter, sort, import, export, submit, approve, reject, assign, or notify.
- Outcome: success, validation stop, permission denial, conflict, empty state, retry, recovery, or audit-visible result.

For each matrix row, decide the coverage layer. E2E must cover the user workflows in scope for the change. Lower layers should cover detailed validation classes, API status variants, database constraints, and branch combinations.

## Data Model and Test Data Design

Data model analysis supplements test-point extraction. It should not be skipped.

Check:

- Required and optional fields.
- Unique constraints.
- Enum values and invalid values.
- Length, numeric, date, and count boundaries.
- Entity relationships.
- Delete, disable, archive, restore, and lifecycle semantics.
- Data ownership and permission boundaries.
- Seed data requirements.

Define test data strategy following `qa-constitution.md` §Test Data Rules (the generate-from-requirement/scenario/project-domain procedure, the realism rubric and business-system language/locale requirement, minimal-data exception, setup order, placeholder blocklist, "missing data is not a blocker"). Generation techniques and where to find the project's domain live in `references/test-data-and-simulation.md`.

For each test point, record:

- Required data state.
- Data creation method.
- Business realism basis: which business rule, API contract, lifecycle state, persona, tenant, permission, ownership boundary, product domain, product language/locale, persistence rule, state transition, visible result, or real workflow makes the data plausible. For API/integration and E2E rows this is mandatory; for unit-level pure technical assertions, record the minimal-data exception instead.
- Isolation key, unique prefix, tenant, or transaction boundary.
- Cleanup method.
- Whether data setup is part of the behavior under test or only a precondition.

## Execution Support

Most test points in a Vibe Coding requirement package should be covered by automated tests in the current testing cycle. The expected default is to check prerequisites before execution and ask a human to resolve missing environment, plugin, account, data, or permission issues.

Use execution support to make automated tests runnable; do not treat execution support as business coverage.

Runtime QA validation may be used before or after automated tests when environment availability is a risk. It verifies startup, health checks, page/API reachability, logs, screenshots, or traces. It is a smoke-level availability check, not a substitute for unit, API/integration, or E2E coverage.

Before execution, perform prerequisite checks:

- Required service, plugin, browser, database, or external dependency is available.
- Required environment variables and credentials are present.
- Required test role/account exists.
- Required seed data, fixture, or mock service is available.
- Required command and test framework are available.

If a prerequisite is missing, do not mark the test as optional or resolved without execution. For missing data, first attempt deterministic setup through the project data setup options. Report the blocker to the human owner only after the safe setup options are unavailable or insufficient, include the exact requirement, and resume execution after the human confirms the blocker is resolved.

Before execution, merge the execution scope from:

- `Test Points`, `TDD Candidates`, `User Scenario Matrix`, and `E2E Scenarios` in the lightweight test design.
- `Regression Impact` in the lightweight test design.
- `Selected Regression Tests` from a separate regression impact analysis when one is used.

Deduplicate by test artifact, command, or scenario. If one test covers both new/modified behavior and old regression behavior, execute it once and report its source as `Both`.

## Coverage Closure

Coverage closure connects test design to actual test coverage. Perform it after generating, updating, and executing automated tests.

`Coverage artifact` may be empty during initial analysis. Update it after the automated test is created and executed; keep it aligned after Green and Refactor.

For each test point:

1. Ensure the in-scope executable test point has a `Coverage artifact` after the automated test is created and executed.
2. If execution is blocked by prerequisites, report the missing prerequisite to the human owner and mark the item as blocked only until the human confirms the prerequisite is resolved.
3. List any test points that remain uncovered and any prerequisite blockers that remain unresolved.

Record `Coverage artifact` per `qa-constitution.md` §Coverage Artifact Format.

Create automated tests when:

- It protects core business behavior.
- It guards an API contract.
- It covers a defect that already happened.
- It is likely to regress.
- It can be run deterministically in local or CI.
- Manual repetition would be costly.

If a scenario truly cannot be covered by an automated unit, API/integration, or E2E test, document why and do not count it as covered by this skill.

Use evidence types consistently:

| Evidence type | Meaning |
| --- | --- |
| Execution evidence | Command, result, report path, CI URL, trace, screenshot, log, or response used to support whether a check ran and passed, failed, or was blocked. |
| Behavioral evidence | The specific behavior assertion proved by the test, such as error code, persisted state, disabled UI action, state transition, or response shape. |
| Coverage evidence | The project-relative test file, test case, or selector that maps a test point to executable coverage. |

## Completeness Checklist

Before generating scripts, verify:

- The expected behavior comes from active requirement authority, existing behavior baseline, or explicit user confirmation as appropriate.
- Requirement conflicts were classified before changing test expectations, existing tests, or production code.
- Normal, invalid, boundary, permission, and state scenarios were considered.
- Data model and API contract were checked when relevant.
- Test points were mapped to appropriate layers.
- Unit/API tests were preferred before E2E when sufficient.
- E2E user workflows were enumerated before selecting browser tests.
- TDD candidates were identified.
- E2E scenarios have persona, path, assertion, data, and cleanup.
- Regression risks were identified for changed behavior.
- Initial regression impact was recorded in the lightweight design, including existing tests to rerun or the reason none are needed.
- Test data setup and cleanup are clear, and follow `qa-constitution.md` §Test Data Rules (realism or documented minimal-data exception; missing data not treated as a blocker; no real secrets or production data).

After creating or executing tests, verify:

- Each in-scope executable test point has a coverage artifact after prerequisites are available.
- New or modified tests were executed and results were recorded.
- Regression tests selected by the lightweight design or separate regression analysis were executed or explicitly blocked.
- Red tests failed for the expected behavior reason before implementation when strict TDD applies.
- Syntax, import, fixture, setup, or environment failures were not counted as valid Red evidence.
- Coverage artifacts follow `qa-constitution.md` §Coverage Artifact Format.
- Commands, logs, screenshots, traces, or reports are recorded as execution evidence when relevant.
- Uncovered test points and unresolved prerequisite blockers are listed explicitly.
- Runtime QA validation, if performed, is treated only as availability smoke evidence and not counted as Unit/API/E2E business coverage.
- A `qa-test-report` exists or has an exact blocker, alternative evidence, and remaining risk recorded.
