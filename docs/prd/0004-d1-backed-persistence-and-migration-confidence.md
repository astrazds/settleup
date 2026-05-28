# PRD: D1-backed Persistence and Migration Confidence

## Problem Statement

SettleUp depends on Cloudflare D1 for saved Event data, but confidence was too concentrated in route and domain tests. The storage layer needed tests that prove checked-in migrations create the schema used by `D1Store`, Event Records survive a real D1 round trip, and multi-record Event mutations remain all-or-nothing.

## Solution

Exercise the D1 adapter against a fresh Miniflare D1 database with every checked-in SQL migration applied. Verify that saved Event Records can be read as Event Snapshots from a new `D1Store`, and that failed multi-record mutations roll back earlier writes instead of leaving partial Event state.

## User Stories

1. As a developer changing D1 schema, I want tests to apply the real migrations, so schema drift fails before deployment.
2. As a developer changing `D1Store`, I want Event Record round-trip tests, so persisted Participants, Expenses, Shares, and Settlement Payments are verified together.
3. As a developer changing Event mutations, I want rollback tests around final Event touch failures, so users do not see partially saved Event state.

## Implementation Decisions

- Use Miniflare D1 and checked-in migration files instead of a hand-written SQL fake.
- Keep D1 tests in the Vitest behavior suite so `npm test`, `npm run test:coverage`, and `npm run verify` include them.
- Share migration setup through a focused test helper under `test/`.
- Verify all-or-nothing behavior for Participant, Expense, and Settlement Payment mutations.

## Testing Decisions

- Cover the migration-backed setup itself by asserting migration files are applied.
- Cover Event Record round trips through a fresh store instance.
- Cover rollback behavior by injecting a failing final Event touch after earlier statements have been scheduled.
- Keep assertions at the storage seam and Event Snapshot level rather than private SQL-building details.

## Out of Scope

- Remote D1 migrations, production data repair, schema redesign, and performance tuning.
- Replacing D1 with another database.

## Implementation Status

Shipped for Forgejo issues `#69` and `#73` through `#75`.

- Added fresh D1 migration confidence tests.
- Added D1 Event Record round-trip coverage.
- Proved D1-backed Event mutations are all-or-nothing for Participants, Expenses, and Settlement Payments.
