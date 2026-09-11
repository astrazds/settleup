# Architecture

SettleUp has two independently deployable runtimes and one wire-contract
package. The Hono API owns the SQLite ledger. The static React Router SPA
renders full server snapshots. `@settleup/contracts` defines their JSON
schemas and types; neither runtime imports the other's source.

## Find the owner

| Change | Start here |
| --- | --- |
| Request or snapshot shape | [`packages/contracts/src/index.ts`](../packages/contracts/src/index.ts) |
| HTTP routes, status codes, ETags, mutation notifications | [`src/server/app.ts`](../src/server/app.ts) |
| `If-Match` grammar | [`src/server/if-match.ts`](../src/server/if-match.ts) |
| Command rules, transactions, access expiry, cleanup | [`src/server/event-service.ts`](../src/server/event-service.ts) |
| Snapshot reads, row hydration, stored amount totals | [`src/server/event-snapshot.ts`](../src/server/event-snapshot.ts) |
| Equal shares, balances, next settlement | [`src/server/ledger.ts`](../src/server/ledger.ts) |
| SQLite connection, schema, scalar row decoding | [`src/server/database.ts`](../src/server/database.ts) |
| SSE subscriptions and publication | [`src/server/change-broker.ts`](../src/server/change-broker.ts) |
| Browser snapshot loading and event layout | [`apps/web/app/routes/event-layout.tsx`](../apps/web/app/routes/event-layout.tsx) |
| Nested event components' snapshot access | [`apps/web/app/components/event-context.ts`](../apps/web/app/components/event-context.ts) |
| Live invalidation and reconnect behavior | [`apps/web/app/lib/use-event-stream.ts`](../apps/web/app/lib/use-event-stream.ts) |
| Form commands and accepted version parsing | [`apps/web/app/lib/form-data.ts`](../apps/web/app/lib/form-data.ts) |
| Draft conflict detection and acceptance | [`apps/web/app/lib/use-accepted-draft.ts`](../apps/web/app/lib/use-accepted-draft.ts) |
| Browser HTTP requests and response validation | [`apps/web/app/lib/api.ts`](../apps/web/app/lib/api.ts) |

## Mutation path

Routes parse JSON, validate the command schema, then parse `If-Match`. Named
service methods resolve the active event and check their resource and domain
rules. `commitMutation` then runs this sequence in one SQLite transaction:

1. Check the current version against the supplied precondition.
2. Reject an unsafe stored aggregate before any write.
3. Check the proposed amount where applicable and write the command's rows.
4. Increment the event version once.

After commit, the service reloads the complete snapshot. The route publishes
only its event ID and version to the process-local broker, sets the ETag, and
returns JSON. The SSE wire message contains only `{ version }`. Event creation
has its own transaction and starts at version one.

The ordering of errors is observable: malformed body and schema errors precede
header errors; resource and domain errors precede stale-version errors; the
stored-total check precedes the proposed-total check. The HTTP mutation tests
exercise these boundaries as well as rollback, event isolation and publication.

Money is integer minor units. Equal shares are derived when an expense is
written and persisted with it. Snapshot assembly reads those shares, checks
aggregate safety using `bigint`, and recomputes balances and the next settlement
suggestion. Access expires three days after creation; cleanup deletes the event
and cascading rows five days after creation.

## Browser state

The event layout's loader owns the current snapshot. `EventProvider` exposes
that loader result to nested routes without copying it into React state. SSE,
focus and online events trigger router revalidation. Mutation actions validate
the response and let the router reload its authoritative snapshot.

Each form owns its editable fields. `useAcceptedDraft` remembers the event
version and entity revision the user accepted. A newer loader snapshot pauses
submission without replacing the draft. Choosing **Load latest** accepts the
current version and remounts uncontrolled fields; each form explicitly resets
its controlled fields. Submission readers return the command together with
that accepted version. Delete actions use the current loader version at
confirmation time.

## Verify a change

`mise.toml` pins tools and exposes the repository gates. Run `mise run check`
for lint, typecheck, unit tests, both production builds, and real-browser tests
in order. Sequential execution matters because several gates rebuild the
contracts output. See [CONTRIBUTING.md](../CONTRIBUTING.md) for browser setup.

Start API behavior checks with `src/server/app.test.ts` and
`src/server/mutations.test.ts`. Browser workflows live in
`apps/web/tests/e2e`; `draft-conflicts.spec.ts` covers live updates while editing,
and `states.spec.ts` checks visual states. Keep product behavior in
[`PRODUCT.md`](../apps/web/PRODUCT.md) and the visual system in
[`DESIGN.md`](../apps/web/DESIGN.md).
