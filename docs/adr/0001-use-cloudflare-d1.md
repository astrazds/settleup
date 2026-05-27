# Use Cloudflare D1 for Event data

SettleUp will use Cloudflare D1 as the first durable database for Event, Participant, Expense, Share, and Settlement Payment data, with Balances derived from those saved records. The project already runs on Cloudflare Workers, the data is relational, and D1 keeps deployment, local development, and Worker bindings inside Wrangler; Supabase remains a reasonable future alternative if hosted Postgres features or true realtime become more important than a single Cloudflare-native stack.
