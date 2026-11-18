# Architecture

SettleUp has two independently deployable runtimes and one wire-contract
package. The Hono API owns the SQLite ledger. The static React Router SPA
renders full server snapshots. `@settleup/contracts` defines their JSON
schemas, types, and the equal-share function; neither runtime imports the
other's source.

## Find the owner

| Change | Start here |
| --- | --- |
| Request or snapshot shape | [`packages/contracts/src/index.ts`](../packages/contracts/src/index.ts) |
| HTTP routes, status codes, ETags, mutation notifications | [`src/server/app.ts`](../src/server/app.ts) |
| `If-Match` grammar | [`src/server/if-match.ts`](../src/server/if-match.ts) |
| Command rules, transactions, access expiry, cleanup | [`src/server/event-service.ts`](../src/server/event-service.ts) |
| Snapshot reads, row hydration, stored amount totals | [`src/server/event-snapshot.ts`](../src/server/event-snapshot.ts) |
| Equal shares | [`packages/contracts/src/shares.ts`](../packages/contracts/src/shares.ts) |
| Balances, next settlement | [`src/server/ledger.ts`](../src/server/ledger.ts) |
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

Routes parse JSON, validate the command schema, then parse `If-Match`.
`commitMutation` starts a SQLite write transaction and performs these steps.

1. Resolve the event and check expiry against the transaction start time.
2. Check the command's resource and domain rules.
3. Check the current version against the supplied precondition.
4. Reject an unsafe stored aggregate before any write.
5. Check the proposed amount where applicable and write the command's rows.
6. Increment the event version once and assemble the complete snapshot.

If snapshot assembly fails, SQLite rolls back the rows and version. After
commit, the route publishes only the event ID and version to the process-local
broker, sets the ETag, and returns JSON. The SSE change message contains only
`{ version }`. Event creation assembles its snapshot in its own transaction
and starts at version one.

Error order is part of the HTTP contract. Body and schema errors precede
header errors, then event access and command-specific resource and domain
checks precede stale-version errors. The stored-total check precedes the
proposed-total check. Unsafe stored totals return `500`. An unsafe proposed
total returns `400`. The HTTP mutation tests cover this order, rollback, event
isolation, and publication after successful writes.

The HTTP parser turns `If-Match` into `EventVersionPrecondition`, owned by the
service. It distinguishes a wildcard from a list of strong version tags.
Omitting the header skips the version check. The browser supplies the version
accepted by the form, so concurrent changes cannot silently overwrite it.

Money is integer minor units. Equal shares are derived when an expense is
written and persisted with their positions in the submitted order. Schema
version two retains legacy share amounts, orders larger shares first to keep
remainder cents with their recipients, and uses the existing SQLite row order for ties.
Earlier writers inserted shares in submitted order but stored no explicit position. Snapshot
assembly groups the event's shares by expense ID, checks aggregate safety
using `bigint`, and recomputes balances and the next settlement suggestion.
Access expires three days after creation. At five days, the event
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
version and entity revision the user accepted. A newer loader snapshot or a
stale save response pauses submission and preserves the draft. Choosing
**Load latest** accepts the current version if already loaded or revalidates
the event first. Acceptance remounts uncontrolled fields, and each form
resets its controlled fields. Submission readers return the command together
with that accepted version. Delete actions use the current loader version at
confirmation time.

The API validates the event token and expiry when an SSE subscription opens.
The subscription uses the event ID without loading the ledger snapshot.
The broker releases the subscription on request abort or response body cancellation.
It sends `connected` with `{}` and `changed` with `{ version }`. The frames
contain no ledger data, and the broker keeps no replay log. Refetching after
connection covers changes between the initial loader request and subscription.
Subscriptions are local to one API process, so deployment uses one API replica.

## Verify a change

[HTTP tests](../src/server/app.test.ts) cover the routes. [Mutation tests](../src/server/mutations.test.ts)
cover preconditions, rollback, and event isolation. The [draft conflict suite](../apps/web/tests/e2e/draft-conflicts.spec.ts)
exercises live updates. The [visual state suite](../apps/web/tests/e2e/states.spec.ts)
covers responsive layouts. See the [contributor guide](../CONTRIBUTING.md#verify-the-change)
for focused commands and the full gate.
