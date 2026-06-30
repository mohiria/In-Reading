# Test Tooling

Use this reference when the project convention for test framework, runner, or validation tool is unclear. Tooling supports the selected test layer; it must not decide the test layer.

## Tooling Priority

Choose tools in this order:

1. Project existing test framework, runner, fixtures, helpers, and CI convention.
2. Existing language ecosystem standard already present in the repository.
3. Skill recommended default for the test scope.
4. Ask before introducing a new dependency, browser runner, container dependency, or parallel test stack.

Do not replace an established project framework only because another tool is listed here.

## Tooling Matrix

The matrix lists common defaults for each test scope. It is not an exclusive mapping.

A test often combines multiple tool roles. For example, JUnit or pytest may run unit tests, API/integration tests, and Selenium-based browser tests. Playwright may provide both the browser runner and browser automation for E2E. Choose the test layer first, then reuse the project's existing runner, drivers, fixtures, environment setup, and reporting tools for that layer.

| Scope / stage | Use for | Default recommendation | Notes |
| --- | --- | --- | --- |
| Unit TDD | Pure logic, validation, state transitions, permission decisions, reducers, formatters | Java: JUnit 5; Python: pytest; JS/TS: Vitest or Jest; C/C++: GoogleTest, Catch2, or doctest; Go: built-in `testing`; Rust: built-in test harness with Cargo | Follow project framework first. Keep tests fast and local. |
| API/integration TDD | API contracts, auth, persistence behavior, service boundaries, error shape | Existing test runner + HTTP client + isolated test database or service fixture | Prefer the project's existing integration bootstrap and cleanup pattern. |
| DB/infrastructure integration | Database constraints, transactions, queues, caches, brokers, external boundary behavior | Existing local/CI dependency setup; Testcontainers only when accepted by the project | Do not introduce containers when a simpler existing fixture proves the behavior. |
| Frontend component tests | Component state, forms, conditional rendering, disabled states, client-side validation | Testing Library with Vitest or Jest | Prefer component tests over E2E for UI rules that do not need a full browser journey. |
| E2E scenario-first | User workflows across UI, routing, service, auth, and data boundaries | Playwright by default; Cypress, Selenium, or WebdriverIO when already established or better aligned with the project | Keep the existing runner if the project already uses one. Prefer Playwright for new web E2E only when no project convention exists. |
| Runtime QA validation | Startup, health, routing, CLI availability, one smoke operation | curl, project HTTP client, browser, CLI, or existing smoke script | Availability evidence only; not Unit/API/E2E business coverage. |
| Failure diagnosis | Test reports, logs, traces, screenshots, videos, response bodies, CI artifacts | Existing runner reports; Playwright trace when using Playwright | Evidence supports diagnosis; it is not coverage by itself. |

## Adoption Rules

- Decide the test layer from the test point first, then choose the tool.
- Tool choice must not change the testing layer.
- A runner or harness can be reused across layers when that is the project convention.
- A scope recommendation is not exclusive; combine runner, driver, fixture, environment, and evidence tools as needed.
- Do not use E2E tools for unit-level rules just because a browser runner is available.
- Do not use runtime smoke checks as a substitute for Unit/API/E2E business coverage.
- Do not mix multiple frameworks for the same layer unless the project already does so or the user approves it.
- Before adding a new dependency, state why the existing tool cannot cover the test point, what the dependency affects, and what alternatives were considered.

## When To Ask

Ask for confirmation when:

- The repository has no test framework and a new dependency is required.
- Multiple frameworks exist for the same layer and no local convention is clear.
- The recommended default conflicts with project convention.
- The test requires containers, browsers, external services, credentials, roles, accounts, or permissions that are not already available.
