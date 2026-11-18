# HTTP API

All event operations are scoped by the private event token.

| Method | Path | Request body |
| --- | --- | --- |
| `POST` | `/api/events` | `{ title, currency, firstParticipantName }` |
| `GET` | `/api/events/:token` | - |
| `GET` | `/api/events/:token/stream` | - |
| `POST` | `/api/events/:token/participants` | `{ name }` |
| `PATCH` | `/api/events/:token/participants/:participantId` | `{ name }` |
| `DELETE` | `/api/events/:token/participants/:participantId` | - |
| `POST` | `/api/events/:token/expenses` | `{ description, amountMinor, payerId, includedParticipantIds }` |
| `PATCH` | `/api/events/:token/expenses/:expenseId` | `{ description, amountMinor, payerId, includedParticipantIds }` |
| `DELETE` | `/api/events/:token/expenses/:expenseId` | - |
| `POST` | `/api/events/:token/payments` | `{ from, to, amountMinor }` |
| `PATCH` | `/api/events/:token/payments/:paymentId` | `{ from, to, amountMinor }` |
| `DELETE` | `/api/events/:token/payments/:paymentId` | - |

Event creation returns `201` with `{ token, snapshot }`. Participant, expense,
and payment creation return `201` with the complete updated snapshot. Updates
and deletions return `200` with that snapshot. Validation errors
return `{ error }` with `400`. Stale `If-Match` preconditions return `412`.
Expired links return `410`.

Snapshot responses include an ETag such as `"v3"`. Send that value in
`If-Match` when changing an existing event to reject a stale write. The header
is optional at the API boundary; the web app sends its accepted event version.
Malformed entity tags return `400`. A syntactically valid list matches if it
contains the current strong version tag. Weak tags do not match, and `*`
accepts the current active event without checking a version.

Supported currencies are `AUD`, `USD`, `EUR`, `GBP`, and `NZD`. Money crosses
the API as integer minor units. Balances and settlement suggestions are
recomputed from the persisted ledger. The event stream opens with `connected`
and `{}`. Subsequent `changed` messages contain only `{ version }`; clients
refetch the snapshot after connection and after a newer version arrives.
