# Bug Report

Replace or delete all example rows before using this artifact for a real project.

## Summary

- Title:
- Severity: P0 / P1 / P2 / P3
- Status: New / Confirmed / Fixed / Blocked
- Found by: test / review / runtime validation / user report
- Related requirement / test point:

Example only. Replace with project-specific behavior.

- Title: User without permission can delete an entity through the API
- Severity: P1
- Found by: API/integration test
- Related requirement / test point: Permission rule: user without delete permission cannot delete the entity

## Environment

- Project / module:
- Branch / commit:
- Environment: local / CI / preview / staging / production-like
- Browser / OS / runtime:
- Test account / role:
- Relevant config:

Do not record secrets, real user data, credentials, or full sensitive logs.

## Reproduction Steps

1. Sign in with a test account that does not have delete permission.
2. Call `DELETE /api/entities/{id}`.
3. Query the entity detail or list.

## Expected Result

- API 返回 HTTP 403。
- 响应体包含统一权限错误码和错误信息。
- Entity data is not deleted.

## Actual Result

- API 返回 HTTP 200。
- Entity record is deleted.

## Evidence

| Evidence type | Location / snippet | Notes |
| --- | --- | --- |
| Command output | `mvn test -Dtest=EntityPermissionApiTest#shouldRejectDeleteWithoutPermission` | Test failed: expected HTTP 403 but got HTTP 200 |
| API response | sanitized response body | 不包含 token 或真实用户数据 |
| Log / trace / screenshot | report path or CI URL | 仅保留必要片段 |

## Failure Classification

| Field | Value |
| --- | --- |
| Failure type | Code implementation problem / Test design problem / Requirement change / Test data problem / Environment problem / Flaky test / Requirement ambiguity |
| Root cause | Delete endpoint checks only authentication, not `entity:delete` permission |
| Why not test-only | Test assertion matches the permission rule; do not change expectation only to pass |

## Impact

- Affected users / roles: Users without delete permission
- Affected data / workflow: Entity deletion
- Regression risk: Medium / High
- Related historical defects:

## Suggested Fix

- Add `entity:delete` permission enforcement at the delete service or API boundary.
- Ensure denied requests do not mutate data.
- Keep the error response shape consistent with existing permission errors.

## Effective Resolution Pattern

- Final effective fix:
- Why it fixed the root cause:
- Ineffective attempts or rejected fixes:
- Future trigger for similar checks:

## Test Reinforcement

| Layer | Required test | Coverage artifact |
| --- | --- | --- |
| Unit | Permission decision rejects role without delete permission | `backend/src/test/java/.../EntityPermissionTest.java#shouldRejectDeleteWithoutPermission` |
| API/integration | `DELETE /api/entities/{id}` returns 403 and data is not deleted | `backend/src/test/java/.../EntityPermissionApiTest.java#shouldRejectDeleteWithoutPermission` |
| E2E | User without permission cannot see or complete delete action | `frontend/tests/e2e/entity-permission.spec.ts#rejects delete without permission` |

## Failure Learning

Record or recommend a project learning if this issue is likely to recur.

- Symptom: User without permission calls delete API and gets HTTP 200.
- Root cause: API boundary missed permission enforcement.
- Fast diagnosis signal: Permission failures often show HTTP 200/204 instead of 403, with data mutated.
- Correct fix pattern: Enforce permission at the service entry and assert denied paths do not mutate data.
- Future trigger: Check permission matrix for delete, approve, archive, and other high-risk operations.
- Knowledge location: project QA notes / issue / wiki / team knowledge base

## Resolution

- Fix commit / PR:
- Tests run:
- Remaining uncovered test points:
- Unresolved prerequisite blockers:
- Final status: Fixed / Won't fix / Duplicate / Blocked
