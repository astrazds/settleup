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

The server stores each event until a cleanup run removes it. The stored data is:

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
`410 Gone` while the expired event still exists. Five days after creation, the
event becomes eligible for deletion. Cleanup runs when the API starts and
every hour while it is running. The next cleanup removes eligible events and
their participant, expense, share, and payment rows. Deleted links return
`404 Not Found`.

This lifecycle covers the application's live database. Hosting logs, database
backups, and copies made by link holders have their own retention policies.

## Browser storage

The web app does not write event tokens or snapshots to browser storage. It
stores an optional participant ID in `sessionStorage`, keyed by the public
event ID. That preference remembers the current person in the tab and is not a
login. Open forms and fetched snapshots remain in memory while the page is
open. The app does not queue offline changes.

The private token remains in the page URL. Browser history, copied links, and
messages used to share the event can retain that URL outside the app's storage.

## Network

The static frontend talks to the API over relative `/api` requests and an
event-stream for live invalidation. There are no analytics pixels, remote
fonts loaded from third-party hosts, or advertising tags. Self-hosted fonts
ship with the app. API responses use `Cache-Control: no-store`, and pages set a
`no-referrer` policy. Live change messages contain an event version, not names
or ledger rows; the browser then fetches the complete snapshot over the API.

Hosting providers and reverse proxies can see request URLs, including private
tokens. Operators should exclude these URLs from access logs and keep shared
caches away from private API responses.

## Contact

For general privacy or support questions, use the
[repository issue tracker](https://github.com/astrazds/settleup/issues). Do not
include private event links, names, or ledger data in a public issue. Report
vulnerabilities through [SECURITY.md](SECURITY.md).
