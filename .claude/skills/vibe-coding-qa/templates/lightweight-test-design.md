# Lightweight Test Design

Replace or delete all example rows before using this artifact for a real project.

## Context

- Requirement / Spec:
- Change summary:
- Target modules / APIs / pages:
- Test environment / constraints:

## Input Sources Checked

- [ ] Active Spec / PRD / acceptance criteria / issue
- [ ] Existing behavior baseline: tests / code / old Spec / API contract
- [ ] Data model / field rules / CRUD matrix
- [ ] API contract / auth rules / error shape
- [ ] UI states / user roles / user paths
- [ ] Code structure / changed code / dependency graph
- [ ] Existing tests / historical defects / flaky areas
- [ ] Test data / credentials / mocks / CI constraints

## Requirement Authority / Conflict Gate

Use only when the change touches existing behavior, tests, API contracts, data model behavior, or old Specs.

| Behavior | Existing baseline | New requirement source | Relationship | Decision authority | Result |
| --- | --- | --- | --- | --- | --- |
| | Existing tests / code / old Spec / API contract / data model | Active Spec / PRD / issue / user confirmation | extends / amends / supersedes / conflicts | Source or owner | Proceed / BLOCKED |

## Pre-Code TDD Gate

Use before changing production code. If production code was already changed before this gate, record it as a TDD violation or Non-TDD Exception.

- Requirement / task source:
- Behavior contract source:
- Ready for production code change: Yes / No / BLOCKED
- Gate evidence type: Red / existing failing test / non-TDD exception / blocker
- Gate evidence:
- Red command/result:
- Expected Red failure reason:
- TDD violation status: None / Violation recorded / Not applicable

## Test Points

List the behavior to prove and the lowest effective layer. `Coverage artifact` may be empty until the test exists and has been executed.

| Test point | Source / authority | Design method | Test layer | Input / precondition | Expected result | Assertion target | Priority | Coverage artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | Unit / API/integration / E2E | | | | P0 / P1 / P2 / P3 | |

## User Scenario Matrix

Use when E2E is in scope. Enumerate user workflows before selecting browser tests.

| Scenario | Persona / role | Entry point | Data state | Operation path | Outcome type | E2E coverage decision |
| --- | --- | --- | --- | --- | --- | --- |
| | | Page / route / modal / deep link | Empty / existing / archived / submitted / approved / rejected / locked | Create / edit / delete / search / submit / approve / reject / export | Success / denial / validation stop / conflict / empty / recovery | Cover with E2E / Lower-layer only with reason / BLOCKED |

## Test Data Plan

Plan deterministic setup, isolation, cleanup, and realistic synthetic business data.
Derive the data per `qa-constitution.md` §Test Data Rules: in `Business realism basis` record the requirement state the data must be in, the scenario/persona it represents, and the concrete project-domain values used (real enum/allowed values and locale), not an abstract phrase.
For unit-level pure technical assertions only, record a minimal-data exception in `Business realism basis`. API/integration and E2E rows must use realistic synthetic business data.
For API/integration rows, cite the API contract, permission state, lifecycle, tenant/ownership, persistence rule, state transition, or business relationship. For E2E rows, cite the persona, entry point, workflow, lifecycle, permission, tenant/ownership, and visible business result.

| Test point / scenario | Required data state | Business realism basis | Setup method | Isolation strategy | Cleanup method | Data blocker status |
| --- | --- | --- | --- | --- | --- | --- |
| | | Domain rule / persona / lifecycle / tenant / permission / workflow basis | Fixture / factory / API / seed / safe test DB / realistic synthetic data | Unique prefix / tenant / transaction / container / storage state | API cleanup / DB cleanup / rollback / unique residual data | Ready / BLOCKED with exact reason |

## TDD Candidates

Use for strict Red-Green-Refactor candidates at unit or API/integration layers.
For statically typed stacks, create the smallest compilable production stub before recording Red. Compile errors, missing method/class/endpoint, import errors, fixture/setup/environment/DB failures, or `NoSuchMethod` are blockers, not Red.

| Test point | Initial failing test | Why it should fail before implementation | Expected Red failure reason | Minimal behavior to pass | Related regression |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Regression Impact

Record expected old behavior and existing tests to rerun while designing the TDD scope. Recheck this section after the actual code and test diff.

| Changed / planned item | Impacted existing behavior | Existing tests to rerun | Historical defects considered | Regression risk | Separate regression analysis needed? |
| --- | --- | --- | --- | --- | --- |
| | | | | Low / Medium / High | Yes / No, with reason |

## E2E Scenarios

Use for selected workflow-level E2E scenarios. Detailed field and API variants should stay in lower layers when possible.

| Scenario | Persona / role | Preconditions | User path | Critical assertions | Cleanup | Evidence on failure |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | screenshot / trace / network log |

## Non-TDD Exceptions

| Scope | Reason strict TDD does not apply | Alternative validation | Residual risk |
| --- | --- | --- | --- |
| | Pure style / copy / low-risk display / one-time script / unrunnable UI or service | | |

## Prerequisite Blockers

| Blocker | Affected test point | Required owner action | Status |
| --- | --- | --- | --- |
| | | | BLOCKED / RESOLVED |

## Coverage Closure

- Ready for code change: Yes / No / BLOCKED
- Red evidence, reusable failing test, non-TDD exception, or exact blocker exists for strict TDD candidates: Yes / No
- User workflows in scope for E2E are enumerated: Yes / No / Not applicable
- Test data plan includes business realism basis and setup path: Yes / No
- Initial regression impact is recorded and existing tests to rerun are listed or justified as not needed: Yes / No
- Uncovered planned test points or blockers:

## Short Examples

Delete this section or replace it with project-specific rows before finalizing the artifact.

Example test point:

| Test point | Source / authority | Design method | Test layer | Input / precondition | Expected result | Assertion target | Priority | Coverage artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Regional sales manager approves submitted renewal discount | PRD discount workflow | State transition | API/integration + E2E | Submitted renewal discount for owned account | Request becomes approved and audit entry is visible | HTTP 200, persisted status, approval badge | P0 | `tests/discount-approval.spec.ts#approvesSubmittedRenewalDiscount` |

Example test data:

| Test point / scenario | Required data state | Business realism basis | Setup method | Isolation strategy | Cleanup method | Data blocker status |
| --- | --- | --- | --- | --- | --- | --- |
| Approve renewal discount | Discount request in `status=submitted`, 12% off a 24-month renewal, owned by the acting regional manager's enterprise account | Regional manager (`role=regional_sales_manager`, holds `discount:approve`) approves a renewal she owns; account `tier=enterprise`; amount taken from the real renewal-discount range, not a round placeholder | API setup via `discountRequestFactory` | Unique prefix and test tenant | API cleanup | Ready |

Example regression impact:

| Changed / planned item | Impacted existing behavior | Existing tests to rerun | Historical defects considered | Regression risk | Separate regression analysis needed? |
| --- | --- | --- | --- | --- | --- |
| Discount approval rule | Existing pending and approved discount transitions | `DiscountApprovalApiTest` | Prior unauthorized approval defect | Medium | No, covered by this design |
