import { serve } from "@hono/node-server";
import { resolve } from "node:path";

import { createApp } from "./app.js";
import { ChangeBroker } from "./change-broker.js";
import { openDatabase } from "./database.js";
import { EventService } from "./event-service.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const databasePath = process.env.SETTLEUP_DB ?? resolve("data/settleup.sqlite");
const publicDir = process.env.SETTLEUP_PUBLIC_DIR ?? resolve("dist/client");
const db = openDatabase(databasePath);
const service = new EventService(db);

service.cleanupExpiredData();
const cleanupInterval = setInterval(() => {
  service.cleanupExpiredData();
}, 60 * 60 * 1000);

const app = createApp({
  broker: new ChangeBroker(),
  publicDir,
  service,
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`SettleUp server listening on http://127.0.0.1:${info.port}`);
});

process.on("SIGINT", () => {
  clearInterval(cleanupInterval);
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearInterval(cleanupInterval);
  db.close();
  process.exit(0);
});
