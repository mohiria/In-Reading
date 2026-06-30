# Test Data and Simulation

Use this reference when a test point needs realistic synthetic business data and ready-made data is not available. This reference owns the **techniques** for generating and simulating data. The **rules** for when data must be realistic, the placeholder blocklist, the setup order, and the "missing data is not a blocker" policy are canonical in `qa-constitution.md` §Test Data Rules and must not be restated here.

## Goal

Produce deterministic, business-realistic data that exercises the behavior under test without depending on production data:

```text
required data state (from lightweight design)
-> reuse existing setup if available
-> otherwise generate realistic synthetic data
-> keep related fields coherent
-> make it reproducible and isolated
-> clean up or mark residual risk
```

Realism serves the assertion. Generate the smallest data that makes the business meaning of the assertion true; do not manufacture volume or variety that the test point does not need.

## Setup Order First

Before generating anything, follow the canonical setup order in `qa-constitution.md` §Test Data Rules: existing fixture/factory/builder/helper -> backend API setup -> project-approved seed script -> isolated test database/transaction/container -> safe test database helper. Generate new data only when no established path already produces the required state, and prefer to extend an existing factory over inventing a parallel one.

## Derive Values From Requirement, Scenario, And Project Domain

The decision of *what values to use* is canonical in `qa-constitution.md` §Test Data Rules (the requirement + scenario + project-domain procedure and the realism rubric). This section operationalizes it before you reach for a technique below:

1. Read the requirement/spec rule the test exercises and the lifecycle/permission/ownership state it implies, so the data is in the exact state being proven, not a convenient one.
2. Identify the persona and workflow from the user scenario matrix, so identities, amounts, and dates reflect that real business context.
3. Read the project's schema, allowed enum values, existing factories/fixtures, a real sample record, and the product's primary language, then pick values from the project's real allowed set and write text in that language (Chinese product -> Chinese names/addresses/text, and so on). Extend an existing factory or persona instead of inventing a parallel shape.

Only after these three are fixed do you choose a generation technique to produce the concrete values.

## Where To Find the Project's Domain

Realistic data is only as good as your reading of the real project. Discover the domain from these sources before inventing anything; prefer extending what already exists.

| What you need | Where to look |
| --- | --- |
| Entities, fields, constraints, enums | Schema, migrations, ORM models/entities, DB DDL. |
| API request/response shapes, status codes, error formats | OpenAPI/Swagger, route/controller definitions, contract docs. |
| Allowed enum / lookup values | Enum and constant definitions, reference/lookup tables, seed scripts. |
| Existing realistic shapes and creation paths | Existing factories/builders/fixtures, test helpers, seed scripts, object mothers — extend these first. |
| Real value ranges and examples | Existing sample or seed records and demo/staging data shapes (never production data), domain docs. |
| Product language and locale | i18n/locale files, UI copy, existing stored data, target-market docs. |
| Business rules and lifecycle states | Spec/PRD, state-machine definitions, validation rules, existing tests. |

If a source is missing, infer from the nearest available evidence and record the assumption. Ask the human owner only when a realistic value depends on domain knowledge that is not in the repo (see `qa-constitution.md` §Test Data Rules for when missing data is a real blocker).

## Generation Techniques

| Technique | Use for | Notes |
| --- | --- | --- |
| Faker-style library | Names, emails, addresses, phone numbers, companies, dates, text | Use the locale that matches the product's users (e.g. zh_CN names for a Chinese product). Seed it for reproducibility. |
| Curated domain value pools | Enum-like fields with business meaning: statuses, roles, plan tiers, categories, currencies | Pick from the product's real allowed values, not arbitrary strings. Keep a small named pool per domain concept. |
| Builders / factories with defaults + overrides | Entities with many fields where only a few matter to the test | Default every field to a valid realistic value; override only the field under test. Keeps tests readable and coherent. |
| Object mothers / named personas | Recurring roles and lifecycle states (e.g. "approved enterprise customer", "suspended trial user") | Encode the business scenario once and reuse it across tests. |
| Sequence / counter for uniqueness | Unique names, IDs, slugs, prefixes | Combine a stable test prefix with a sequence so records are unique and identifiable for cleanup. |
| Deterministic seeding | Any randomized generation | Fix the seed so the same run produces the same data; record the seed when a failure must be reproduced. |

## Relational and Lifecycle Coherence

Business-realistic data is internally consistent and matches the requirement state and usage scenario it was derived from. When generating related records, keep them coherent:

- Dates in order: `createdAt <= submittedAt <= approvedAt <= closedAt`; expiry after start.
- Amounts consistent with status: a `refunded` order should have a refund amount; a `draft` invoice should not be `paid`.
- Ownership and tenancy aligned: a record's owner, tenant, and the acting persona's permissions must agree with the workflow being tested.
- Lifecycle state matches required relationships: an `approved` request needs an approver; a `child` record needs a valid parent.
- Permission state matches the assertion: for a denied-path test, generate a persona that genuinely lacks the permission, not one that happens to be blocked by unrelated state.

Generate the related graph through the same factory/builder so these invariants hold automatically, rather than assembling fields by hand per test.

## Volume and Variety

Match data volume to the test point, guided by the representative-selection rules in `references/test-analysis-and-design.md`:

- Boundary tests: generate exactly the boundary cases (empty, one, max, just over).
- Pagination/sorting/filtering: generate the smallest set that proves ordering and page edges, with deterministic, distinguishable values.
- List/empty states: generate the empty case and a small populated case; do not seed hundreds of rows unless the behavior is about scale.
- Do not create combinatorial data explosions to chase coverage; representative coherent records beat large random ones.

## Reproducibility and Isolation

- Seed all randomness and record the seed alongside failing-test evidence so a flake can be reproduced.
- Make every created record identifiable (stable test prefix + sequence) so cleanup and debugging are reliable.
- Isolate via unique prefixes, dedicated test tenants/roles, transaction rollback, or containers per the project convention.
- Never embed real secrets, real personal data, or production records (canonical rule in `qa-constitution.md` §Test Data Rules).

## When To Build a Helper vs. Ask

- Build a small generator/factory when the same realistic shape is needed by more than one test or the coherent graph is non-trivial. Follow existing project conventions and naming.
- Add to an existing factory rather than creating a competing one.
- Ask the human owner (report a blocker) when the required business rules are unclear, a realistic value depends on domain knowledge you do not have, or a credential/account/permission is needed that cannot be created safely.

## Review Checklist

- Existing fixtures/factories/API/seed paths were tried before generating new data.
- Generated data is business-realistic and free of placeholder values (see `qa-constitution.md` §Test Data Rules).
- Related fields, dates, amounts, statuses, ownership, tenancy, and lifecycle states are coherent.
- Randomness is seeded and reproducible; created records are uniquely identifiable.
- Volume matches the test point and avoids combinatorial noise.
- Isolation and cleanup (or documented residual risk) are in place.
- The business-realism basis is recorded in the lightweight design / QA report data evidence sections.
