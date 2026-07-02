# API And Integration Testing

Use this reference after lightweight test design identifies API-level or integration-level test points. API and integration tests verify observable service behavior across boundaries that unit tests cannot prove reliably.

Use the project's existing test framework, runner, fixtures, and integration bootstrap first. If no convention exists, consult `references/test-tooling.md`.

## Goal

API and integration testing verifies connected behavior:

```text
API contract / service rule / persistence rule / integration boundary
-> Red test when practical
-> minimum implementation
-> contract and data assertions
-> coverage artifact updated
```

These tests should prove request validation, authorization, response shape, error conventions, persistence, transactions, service collaboration, and external-service boundary behavior.

## When To Use API Or Integration Tests

Prefer API or integration tests when correctness depends on a boundary outside a single unit:

| Target | Examples |
| --- | --- |
| API contract | Method, path, status code, request schema, response schema, error shape. |
| Authorization | Anonymous, authenticated, role-based, ownership, tenant, and permission matrix rules. |
| Persistence | Create, update, delete, uniqueness, transactions, query filters, pagination, sorting. |
| Service integration | Controller to service to repository behavior, event publication, queue enqueueing. |
| Data consistency | Before/after DB state, derived fields, audit fields, idempotency, rollback. |
| External boundary | Third-party client, payment gateway, file storage, notification, feature service. |
| Historical defects | Escaped API, permission, transaction, or integration bugs. |

If a behavior can be proven deterministically with a unit test and does not depend on real contracts or persistence, prefer the unit layer.

## Required Inputs

Before writing an API or integration test, collect:

- The lightweight test design row for the test point.
- API contract, route definition, schema, status code convention, and error shape.
- Auth model, role matrix, ownership rules, tenant rules, and feature flags.
- Data model, constraints, default values, lifecycle states, and transaction expectations.
- Existing test framework, app bootstrap, test database, fixtures, factories, and cleanup pattern.
- Integration boundary strategy: real local service, container, fake, mock server, or stub.

If the contract or expected behavior is ambiguous, stop and ask for clarification. Use the current implementation to understand the existing behavior baseline, not to define changed expected behavior. If active requirement authority conflicts with the baseline, use the Requirement Conflict Gate before changing tests or production code.

## TDD Workflow

Use strict Red-Green-Refactor for API and integration behavior when the contract or expected service behavior is known before implementation.

1. Select one in-scope executable test point from the lightweight design.
2. Find the smallest existing API/integration test file or create one following project conventions.
3. In a statically typed stack, create the smallest compilable stub for the target API, mapper, controller, route handler, service method, or DTO shape before writing the Red test when the target symbol does not exist. The stub must expose the intended signature or route but must not implement the real behavior.
4. Write the Red test at the boundary that proves the behavior.
5. Run the new or directly relevant test and confirm it fails for the expected behavior reason, such as wrong status, missing field, wrong persisted state, or empty result where data is expected. Syntax, import, compile, missing symbol, setup, fixture, environment, database, or service failures are blockers/setup failures, not Red evidence.
6. Implement the minimum production change needed to pass.
7. Rerun the new or modified test.
8. Run directly affected existing API/integration tests and relevant unit tests.
9. Refactor only with tests passing.
10. Update `Coverage artifact` with the project-root relative test path and optional `#testName`.

If the Red test cannot be created or executed because a database, service, credential, plugin, account, seed, or permission is missing, follow the setup order in `qa-constitution.md` §Test Data Rules before reporting a blocker, then resume after the human confirms it is resolved.

## Contract Assertions

API tests must verify more than a successful status.

Assert the relevant contract details:

- HTTP method and route.
- Status code for success and failure paths.
- Required request fields and invalid request handling.
- Response body shape and required fields.
- Domain error code, message key, or error format.
- Authorization result for each relevant role or ownership state.
- Data state before and after mutation.
- Headers, cookies, idempotency keys, or pagination metadata when part of the contract.

Weak assertions are not enough:

- Only checking HTTP 200.
- Only checking that a response is not null.
- Only checking that an array has any item when exact filtering or sorting matters.
- Ignoring the error body for negative cases.
- Testing through a mocked controller while claiming API coverage.

## Data And Isolation Rules

Test data rules and the default setup order are canonical in `qa-constitution.md` §Test Data Rules; generation techniques are in `references/test-data-and-simulation.md`. Derive every value from the requirement state, the acting persona, and the project's real domain (schema, allowed enums, existing factories) per that procedure. The unit-level minimal-data exception does not apply to API or integration tests.

API/integration adds these layer-specific requirements:

- Record why the data is business-realistic for this boundary: API contract, permission state, lifecycle, tenant or ownership boundary, persistence rule, state transition, or business relationship.
- Keep request payloads, persisted state, and expected side effects coherent; do not combine impossible statuses, dates, owners, tenants, or approval states.
- Use unique names, IDs, or prefixes, and verify cleanup for tests that create durable records, files, jobs, or messages.
- Keep setup close to the test unless shared fixtures are already established; prefer explicit setup over hidden global state.

When testing persistence, assert the stored state when correctness depends on it. Response assertions alone are not enough for data consistency rules.

## Authorization And Permission Matrix

Authorization bugs are high risk. Cover both allowed and denied paths.

For permission-sensitive behavior, test:

- Anonymous or missing token.
- Authenticated user without permission.
- User with permission.
- Owner versus non-owner when ownership matters.
- Tenant or organization boundary when multi-tenant.
- Disabled, archived, or inactive account state when relevant.

Assert both the API result and the durable side effect:

- Denied request returns the correct status and error shape.
- Denied request does not mutate data.
- Allowed request mutates only the intended records.

## Integration Boundary Strategy

Choose the narrowest reliable boundary that proves the behavior:

| Boundary | Use when |
| --- | --- |
| Real local dependency | The dependency is cheap, deterministic, and available in local/CI. |
| Test container | Persistence, queue, cache, or broker behavior matters. |
| Mock server | External HTTP contract matters but the real service is not suitable for tests. |
| Stub or fake | The external result is simple and the contract is covered elsewhere. |
| Unit mock | Only collaborator call logic matters; this is usually unit coverage, not integration coverage. |

Do not call live third-party production services from automated tests. If an external integration requires real credentials or a sandbox account, report it as a prerequisite and keep secrets out of test code.

## Negative And Edge Cases

Include negative cases when they protect contracts or risks:

- Missing required field.
- Invalid type, format, enum, range, or length.
- Duplicate unique field.
- Unauthorized or forbidden user.
- Nonexistent resource.
- Cross-tenant or cross-owner access attempt.
- Invalid lifecycle transition.
- Conflicting update or stale version.
- External dependency failure, timeout, or malformed response when handled by the service.

Use boundary value analysis for field limits and pagination. Use decision tables for permissions, statuses, feature flags, and workflow transitions.

## Coverage Closure

After creating or modifying API/integration tests:

1. Run the new or modified API/integration tests.
2. Run directly affected unit tests and existing API/integration tests.
3. Record the command and result as evidence.
4. Update the lightweight design `Coverage artifact` per `qa-constitution.md` §Coverage Artifact Format.
5. List uncovered API/integration test points and unresolved prerequisite blockers.
6. Ensure the final `qa-test-report` records API/integration data setup evidence, business realism evidence, cleanup, and execution evidence.

Runtime QA validation is not API/integration coverage (see `qa-constitution.md` §Runtime QA Validation Rule).

## Review Checklist

Before accepting API or integration tests, verify:

- The tests trace to lightweight test design rows.
- Red tests were run before implementation when strict TDD applies.
- Assertions cover status, body, error shape, and data side effects when relevant.
- Authorization includes both allowed and denied paths.
- Test data is deterministic, isolated, and cleaned up.
- External boundaries use a clear real/container/mock-server/stub strategy.
- No production data or real secrets are used.
- New, modified, and directly affected tests were executed.
- Coverage artifacts were updated after execution.
- Remaining uncovered test points and unresolved prerequisite blockers are explicit.
- Test data follows `qa-constitution.md` §Test Data Rules and cites the API contract, persistence rule, permission state, or integration behavior that makes it realistic.
- QA report evidence records the API/integration data setup, business realism basis, isolation or cleanup, and command/report evidence.
