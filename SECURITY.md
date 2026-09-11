# Security policy

## Supported versions

Security fixes are applied to the latest version on the `main` branch.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Earlier versions | No |

## Access boundary

The complete event link is a bearer credential. Anyone with it can read and
change the event. Participant names are labels, not authenticated identities,
and the creator has no separate owner permissions. There is no account-based
recovery or per-person access revocation.

The database stores a hash of the event token. API URLs and event snapshots
contain the plaintext token so clients can access the event. Do not include
these URLs or response bodies in logs, screenshots, reports, or public issues.
Private links expire after three days. Cleanup eligibility starts after five
days, with deletion at the next startup or hourly cleanup run. See
[PRIVACY.md](PRIVACY.md) for storage and retention details.

## Host the app

Serve the frontend and API through one HTTPS origin. Preserve the API's
`Cache-Control: no-store` response header, disable caching and buffering for
event streams, and avoid recording token-bearing URLs in access logs. The
frontend sets `no-referrer` to limit URL disclosure through navigation.

Protect the SQLite files, backups, and any operator logs with host-level access
controls. Application cleanup deletes database rows; it does not remove backup
copies or erase links saved by participants. Deployment paths and environment
variables are documented in the [README](README.md#sqlite-retention-and-deploy).

## Reporting a vulnerability

Please report suspected vulnerabilities privately through
[GitHub Security Advisories](https://github.com/astrazds/settleup/security/advisories/new).
Include the affected version, impact, reproduction steps, and any suggested
mitigation. Please do not open a public issue for an undisclosed vulnerability.
