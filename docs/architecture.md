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
| API process, environment, startup and hourly cleanup | [`src/server/server.ts`](../src/server/server.ts) |
| SSE subscriptions and publication | [`src/server/change-broker.ts`](../src/server/change-broker.ts) |
| Browser snapshot loading and event layout | [`apps/web/app/routes/event-layout.tsx`](../apps/web/app/routes/event-layout.tsx) |
| Nested event components' snapshot access | [`apps/web/app/components/event-context.ts`](../apps/web/app/components/event-context.ts) |
| Live invalidation and reconnect behavior | [`apps/web/app/lib/use-event-stream.ts`](../apps/web/app/lib/use-event-stream.ts) |
| Form commands and accepted version parsing | [`apps/web/app/lib/form-data.ts`](../apps/web/app/lib/form-data.ts) |
| Draft conflict detection and acceptance | [`apps/web/app/lib/use-accepted-draft.ts`](../apps/web/app/lib/use-accepted-draft.ts) |
| Browser HTTP requests and response validation | [`apps/web/app/lib/api.ts`](../apps/web/app/lib/api.ts) |
| Tab-session participant preference | [`apps/web/app/lib/participant-preference.ts`](../apps/web/app/lib/participant-preference.ts) |
| Shared participant display names and initials | [`apps/web/app/lib/participants.ts`](../apps/web/app/lib/participants.ts) |

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
returns JSON. The SSE change message contains only `{ version }`. Event creation
has its own transaction and starts at version one.

Error order is part of the HTTP contract. Body and schema errors precede
header errors, then event access and command-specific resource and domain
checks precede stale-version errors. The stored-total check precedes the
proposed-total check. Unsafe stored totals return `500`; an unsafe proposed
total returns `400`. The HTTP mutation tests cover this order, rollback, event
isolation, and publication after successful writes.

The HTTP parser turns `If-Match` into `EventVersionPrecondition`, owned by the
service. It distinguishes a wildcard from a list of strong version tags.
Omitting the header skips the version check. The browser supplies the version
accepted by the form, so concurrent changes cannot silently overwrite it.

Money is integer minor units. Equal shares are derived when an expense is
written and persisted with it. Snapshot assembly reads those shares, checks
aggregate safety using `bigint`, and recomputes balances and the next settlement
suggestion. Access expires three days after creation. At five days, the event
becomes eligible for deletion with its cascading rows. Startup and hourly
cleanup remove eligible events. Expired links return `410` before cleanup and
`404` after the rows have been deleted.

## Browser state

The event layout's loader owns the current snapshot. `EventProvider` exposes
that loader result to nested routes without copying it into React state. A
stream connection, a newer event version, window focus while online, and an
online event trigger router revalidation. Mutation actions validate
the response and let the router reload its authoritative snapshot.

Each form owns its editable fields. `useAcceptedDraft` remembers the event
version and entity revision the user accepted. A newer loader snapshot pauses
submission without replacing the draft. Choosing **Load latest** accepts the
current version and remounts uncontrolled fields; each form explicitly resets
its controlled fields. Submission readers return the command together with
that accepted version. Delete actions use the current loader version at
confirmation time.

The API validates event access when an SSE subscription opens. The broker sends
`connected` with `{}` and `changed` with `{ version }`; it does not send ledger
data or maintain a replay log. Refetching after connection covers changes
between the initial loader request and subscription. Subscriptions are local
to one API process, so deployment uses one API replica.

## Verify a change

`mise.toml` pins tools and exposes the repository gates. Run `mise run check`
for lint, typecheck, unit tests, both production builds, and real-browser tests
in order. Sequential execution matters because several gates rebuild the
contracts output. See [CONTRIBUTING.md](../CONTRIBUTING.md) for browser setup.
Frontend lint and typecheck each run `react-router typegen` first. Generated
route types under `apps/web/.react-router` and compiled contracts under
`packages/contracts/dist` are build output, not source to edit or commit.

Start API behavior checks with `src/server/app.test.ts` and
`src/server/mutations.test.ts`. Browser workflows live in
`apps/web/tests/e2e`; `draft-conflicts.spec.ts` covers retained drafts and explicit
acceptance of live updates, and `states.spec.ts` checks visual states. CI runs
the semantic browser suite in all four configured projects. Pixel snapshots
run locally in mobile and desktop Chromium. See the contributor guide for
focused commands and snapshot tolerances. Keep product behavior in
[`PRODUCT.md`](../apps/web/PRODUCT.md) and the visual system in
[`DESIGN.md`](../apps/web/DESIGN.md).
