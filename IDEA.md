# The No-Login Group Expense Splitter

> Historical seed. This file preserves the original idea sketch. Current product decisions live in `PRODUCT.md`, domain language lives in `CONTEXT.md`, and durable decisions live in `docs/adr/`.

- **The Problem:** Splitting a dinner bill or weekend trip expenses usually requires everyone downloading the same app, creating accounts, and syncing contacts.
- **The "One Thing":** A temporary, shared link to track who owes what for a single event.
- **The User Experience:** You hit "Create Trip," get a unique URL (e.g., `split.me/xyz-weekend`), and text it to the group chat. Anyone with the link can type `"Sarah paid $80 for dinner"` or `"John paid $20 for gas"`. The app shows a live balance of who owes who.
- **Why Hono shines:** Because it has zero cold-start latency when deployed to the Edge, the page loads instantly on spotty data connections when people are out at restaurants. Paired with a lightweight real-time database, it updates instantly for everyone.

Let's call the project **"SettleUp"** for now. Here is your blueprint for building this with Hono.

## The "No-Login" Architecture

Since there are no accounts, **the unique URL is the key to the kingdom**. If a user has the URL, they are a member of that trip.

When someone visits the link, the frontend can simply ask, *"What's your name?"* and save it to the browser's `localStorage`. From then on, whenever they add an expense, the app automatically knows who they are without them ever signing in.

## The Stack Recommendation

- **Framework:** Hono
- **Runtime/Hosting:** Cloudflare Workers (Unbelievable free tier, global edge deployment).
- **Database:** Cloudflare D1 (A native, edge-compatible SQLite database) or Supabase. SQLite is perfect here because relational data (Trips â Expenses) fits SQL beautifully.
