# Deploy SettleUp

The server uses `better-sqlite3` with foreign keys and WAL mode. Private links
work for three days. Cleanup runs at startup and hourly, deleting events whose
five-day cleanup deadline has passed. After deletion, their links return `404`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP listening port |
| `SETTLEUP_DB` | `data/settleup.sqlite` | SQLite path; `:memory:` is also supported |

`mise run build` produces `dist` for the API and `apps/web/build/client`
for the static host. Start the built API with `mise exec -- npm start` from
the repository root, with workspace dependencies and the built contracts
package available. Keep the SQLite directory on persistent writable storage.

Expose both runtimes through one HTTPS origin. Route `/api/*` to the API,
serve static assets from the frontend build, and use its `index.html` as the
fallback for client routes. Private JSON and event streams must not be cached.
The edge must allow long-lived, unbuffered SSE. Run one API replica because the
event broker is process-local. See [SECURITY.md](../SECURITY.md) for link and log
handling at the host.
