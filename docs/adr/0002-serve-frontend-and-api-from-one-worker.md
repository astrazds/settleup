# Serve the frontend and API from one Worker

SettleUp will start as a single Hono Worker that serves both the lightweight user interface and the JSON API from one Cloudflare deployment. A separate frontend build is unnecessary for the first version because the product surface is small, and keeping one Worker avoids extra hosting, routing, and deployment boundaries until the interface becomes complex enough to justify them.
