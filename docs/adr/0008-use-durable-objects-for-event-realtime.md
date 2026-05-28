# Use Durable Objects for Event realtime

SettleUp will use one Durable Object room per Event token to coordinate WebSocket clients and broadcast Event-change notifications after successful saved mutations. Cloudflare's Durable Object WebSocket hibernation API keeps this realtime path inside the existing Worker deployment and gives each Event a natural coordination atom without moving Event data out of D1.

D1 remains the saved Event source of truth. The Durable Object does not own Participants, Expenses, Shares, Settlement Payments, Balances, or Suggested Settlements; clients refresh the Event Snapshot after a change notification. Browser polling remains as a fallback for unavailable or reconnecting WebSockets.

This replaces the earlier MVP assumption that lightweight polling was enough. The trade-off is extra Cloudflare configuration and a Durable Object migration in exchange for a noticeably better shared Event experience without adding accounts, locks, presence, chat, or edit attribution.
