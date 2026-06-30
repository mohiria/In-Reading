---
name: vibe-coding-qa
description: Guide Vibe Coding QA work with TDD-driven layered testing. Use when analyzing testability, designing lightweight test cases, generating or reviewing unit tests, API/integration tests, E2E scenarios, regression scope, runtime QA validation, test failure analysis, or quality gates for AI-generated code.
---

# Vibe Coding QA

Use this skill to organize QA work in Vibe Coding. The goal is not to create heavy traditional test documents. The goal is to use TDD, lightweight test design, layered test execution, regression analysis, runtime validation, and failure feedback to keep AI-generated code constrained by verifiable quality standards.

## Core Workflow

Follow this order by default:

1. Read `references/qa-constitution.md` for the mandatory testing principles.
2. Analyze the Spec, PRD, data model, API contract, code structure, and code changes.
3. Read `references/test-analysis-and-design.md` and create a lightweight test design, including requirement authority checks, representative test points, TDD candidates, E2E scenarios, test data plan, and initial regression impact for changed existing behavior. Small changes may use a minimal lightweight design, but it must still record the requirement source, test point, TDD Red evidence or exception/blocker, and regression impact.
4. Classify each test point into the right coverage layer: unit, API/integration, or E2E.
5. Before changing production code, confirm a valid Red test, reusable failing test, documented non-TDD exception, or exact prerequisite blocker.
6. Generate or review unit tests first for core logic and business rules.
7. Generate or review API/integration tests for service contracts, authorization, data consistency, and integration behavior.
8. Generate or review E2E scenarios for all in-scope user workflows. E2E uses scenario-first design, but does not require strict Red-Green TDD.
9. Recheck regression impact against the actual code and test diff, then merge new/modified test points and selected regression tests into one execution scope.
10. Perform coverage closure: update coverage artifacts, list uncovered test points, and report unresolved prerequisite blockers.
11. Run or plan runtime QA validation only when the environment or deployment must prove basic availability.
12. If tests fail, classify the failure before changing code or tests.
13. Generate or update `qa-test-report` at the end of the QA cycle. Include TDD evidence, execution source, regression evidence, API/integration and E2E test data evidence, and requirement authority or conflict review when relevant.

## TDD Position

TDD is the default organizing principle for this skill.

- Use strict Red-Green-Refactor for unit tests and API/integration tests whenever the behavior can be tested before implementation.
- Use scenario-first E2E design for user workflows: enumerate personas, entry points, data states, permissions, lifecycle states, normal paths, denial paths, and recovery paths before implementation. Do not force E2E Red-Green when the UI or service is not runnable yet.
- Every generated test must trace back to a Spec item, test point, risk, code path, API contract, or historical defect.
- A test without a clear purpose, input or precondition, expected result, and assertion target is invalid.

## Reference Selection

Load only the reference needed for the current task.

| Task | Read |
| --- | --- |
| Establish mandatory rules, quality gates, or anti-fake-test policy | `references/qa-constitution.md` |
| Extract test points or decide test layers | `references/test-analysis-and-design.md` |
| Generate realistic synthetic / simulated test data | `references/test-data-and-simulation.md` |
| Choose test framework or runner when project convention is unclear | `references/test-tooling.md` |
| Generate or review unit tests | `references/unit-testing.md` |
| Generate or review API/integration tests | `references/api-and-integration-testing.md` |
| Generate or review E2E scenarios or browser E2E tests | `references/e2e-testing.md` |
| Decide what old tests to run after a change | `references/regression-testing.md` |
| Verify a real running service or app before merge/release | `references/runtime-qa-validation.md` |
| Analyze local or CI test failures | `references/failure-analysis.md` |

## Mandatory Rules

`references/qa-constitution.md` is the canonical rulebook. Read it first; it governs the points below and must not be weakened. Key non-negotiables:

- Lightweight test design comes before test scripts. Even small changes must record requirement source, representative test point, TDD Red evidence or a documented exception/blocker, and initial regression impact.
- A Red test is valid only when it fails for the expected-behavior reason; syntax/import/compile/missing-symbol/setup/fixture/environment failures are blockers, not Red evidence. In statically typed stacks, create the smallest compilable stub first, then capture assertion-level Red. Prefer the lowest effective layer (unit -> API/integration -> E2E).
- Execute every in-scope executable test point, or explicitly block it; run all new and modified tests. Execution scope combines design and regression coverage, with each item reported as `Design`, `Regression`, or `Both`.
- Before modifying or deleting an existing test, apply the Requirement Conflict Gate (extends/amends/supersedes/conflicts) and state the authority. Never weaken assertions, drop negative cases, skip tests, or bend expected behavior just to pass.
- Test data follows the canonical `## Test Data Rules`: generate business data from the requirement state, the usage scenario/persona, and the project's real domain (schema, allowed enums, existing factories) so it simulates reality; realistic synthetic business data when meaning matters, a documented minimal-data exception only for unit-level technical assertions, and "missing ready-made data is not a blocker." Generation techniques are in `references/test-data-and-simulation.md`.
- Runtime QA validation is availability smoke only; it never counts as Unit/API/E2E business coverage.
- Cite evidence for every conclusion, and produce or update `qa-test-report` for any QA cycle (or record the exact blocker, alternative evidence, and remaining risk).

## Deliverables

Use the templates according to the QA cycle:

- `templates/lightweight-test-design.md` for test design before script generation, including initial regression impact.
- `templates/regression-impact-analysis.md` for expanded regression scope when the change is high-risk, cross-module, requirement-conflicting, heavily test-changing, or release-critical.
- `templates/bug-report.md` for defects found during testing, review, or validation.
- `templates/qa-test-report.md` is the default completion artifact for any QA cycle with test execution, generated or modified tests, regression, API/integration, E2E, runtime validation, or failure analysis. Include runtime QA validation evidence when required.

Template artifacts are working documents for both AI execution and human review. Keep each artifact focused on its purpose: design templates decide what should be tested before code, regression templates justify what old behavior to rerun, and final reports summarize execution evidence and remaining risk. Use short realistic examples when they clarify how to fill a section, but do not turn templates into full rule manuals; detailed testing rules belong in `references/`.

When a template file is needed, copy or adapt its structure into the project artifact requested by the user. Do not create unnecessary documents.

Final QA reports should use structured evidence summaries instead of long raw logs. Record execution evidence, behavioral evidence, coverage evidence, API/integration and E2E test data evidence, TDD Red/Green/Regression evidence, and unresolved requirement conflicts in the relevant report sections. Run `node scripts/qa_artifacts.mjs check qa-test-report <artifact-path>` when practical and report unresolved FAIL or WARN findings.

## Script

`scripts/qa_artifacts.mjs` is a deterministic helper only. It must not decide test scope, evaluate test quality, execute tests, or replace engineering judgment. Commands:

- `node scripts/qa_artifacts.mjs list` — list available templates.
- `node scripts/qa_artifacts.mjs create <template-name> <output-path>` — copy a template to a new artifact path.
- `node scripts/qa_artifacts.mjs check <template-name> <artifact-path>` — structure check (required sections, placeholder content, evidence fields, obvious retained examples).

`check` supports `lightweight-test-design`, `qa-test-report`, `regression-impact-analysis`, and `bug-report`. Run it when practical and report unresolved FAIL or WARN findings.
