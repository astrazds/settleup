# Privacy

Effective date: 2026-09-05

SettleUp is a no-login shared-expense app for short-lived private-by-link
events. The complete event link is the access credential. Anyone who has that
link can view and edit the event.

## Data collection

SettleUp does not create accounts, collect analytics, serve advertising, or
sell personal information. It does not move money. Payments happen outside the
app; SettleUp only records that they were made.

There is no authenticated identity. Participant names are labels chosen by
people who hold the event link.

## What the server stores

Each event is stored until its cleanup deadline. The server keeps:

| Data | Purpose |
| --- | --- |
| Hashed event token | Look up the event from the private link without storing the token in plaintext |
| Event title, currency, and timestamps | Identify the shared session |
| Participant names | Show who can pay or share an expense |
| Expenses, equal shares, and recorded payments | Recompute balances and the next settlement suggestion |

The event token in the URL is a secret. Do not post it publicly. Participant
names and amounts are visible to everyone who has the complete link.

## Retention

Private event links work for three days after creation. Expired links return
`410 Gone`. Event rows remain until the cleanup deadline five days after
creation, then the event and related participant, expense, share, and payment
rows are deleted.

## Browser storage

The web app does not persist event tokens or snapshots. The current tab may
remember a participant ID keyed by the public event ID so the same person can
stay selected while they work. That preference is not a login.

## Network

The static frontend talks to the API over relative `/api` requests and an
event-stream for live invalidation. There are no analytics pixels, remote
fonts loaded from third-party hosts, or advertising tags. Self-hosted fonts
ship with the app.

## Contact

For privacy or support questions, use the repository issue tracker:

https://github.com/astrazds/settleup/issues
