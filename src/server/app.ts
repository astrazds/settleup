import { Hono, type Context } from "hono";
import {
  type EventSnapshot,
  createEventCommandSchema,
  expenseCommandSchema,
  participantCommandSchema,
  paymentCommandSchema,
} from "@settleup/contracts";

import { ChangeBroker } from "./change-broker.js";
import { AppError } from "./errors.js";
import { EventService } from "./event-service.js";
import { readVersionPrecondition } from "./if-match.js";
import { parseRequestBody } from "./validation.js";

interface AppOptions {
  broker?: ChangeBroker;
  service: EventService;
}

export function createApp({ broker = new ChangeBroker(), service }: AppOptions): Hono {
  const app = new Hono();

  app.use("*", async (context, next) => {
    context.header("X-Robots-Tag", "noindex, nofollow");
    await next();
  });

  app.use("/api/*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  });

  app.onError((error, context) => {
    if (error instanceof AppError) {
      return context.json({ error: error.message }, error.status);
    }

    console.error(error);
    return context.json({ error: "Internal server error." }, 500);
  });

  app.post("/api/events", async (context) => {
    const result = service.createEvent(
      parseRequestBody(createEventCommandSchema, await readJson(context.req)),
    );
    setEventVersionHeader(context, result.snapshot.event.version);
    return context.json(result, 201);
  });

  app.get("/api/events/:token", (context) => {
    const snapshot = service.getSnapshotByToken(context.req.param("token"));
    setEventVersionHeader(context, snapshot.event.version);
    return context.json(snapshot);
  });

  app.get("/api/events/:token/stream", (context) => {
    const snapshot = service.getSnapshotByToken(context.req.param("token"));
    const stream = broker.subscribe(snapshot.event.id, context.req.raw.signal);
    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });

  app.post("/api/events/:token/participants", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.addParticipant(
      token,
      parseRequestBody(participantCommandSchema, await readJson(context.req)),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot, 201);
  });

  app.patch("/api/events/:token/participants/:participantId", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.renameParticipant(
      token,
      context.req.param("participantId"),
      parseRequestBody(participantCommandSchema, await readJson(context.req)),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot);
  });

  app.delete("/api/events/:token/participants/:participantId", (context) => {
    const snapshot = service.deleteParticipant(
      context.req.param("token"),
      context.req.param("participantId"),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot);
  });

  app.post("/api/events/:token/expenses", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.createExpense(
      token,
      parseRequestBody(expenseCommandSchema, await readJson(context.req)),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot, 201);
  });

  app.patch("/api/events/:token/expenses/:expenseId", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.updateExpense(
      token,
      context.req.param("expenseId"),
      parseRequestBody(expenseCommandSchema, await readJson(context.req)),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot);
  });

  app.delete("/api/events/:token/expenses/:expenseId", (context) => {
    const snapshot = service.deleteExpense(
      context.req.param("token"),
      context.req.param("expenseId"),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot);
  });

  app.post("/api/events/:token/payments", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.createPayment(
      token,
      parseRequestBody(paymentCommandSchema, await readJson(context.req)),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot, 201);
  });

  app.patch("/api/events/:token/payments/:paymentId", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.updatePayment(
      token,
      context.req.param("paymentId"),
      parseRequestBody(paymentCommandSchema, await readJson(context.req)),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot);
  });

  app.delete("/api/events/:token/payments/:paymentId", (context) => {
    const snapshot = service.deletePayment(
      context.req.param("token"),
      context.req.param("paymentId"),
      readVersionPrecondition(context.req.header("If-Match")),
    );
    return mutationResponse(context, snapshot);
  });

  function mutationResponse(context: Context, snapshot: EventSnapshot, status: 200 | 201 = 200) {
    broker.publish({ eventId: snapshot.event.id, version: snapshot.event.version });
    setEventVersionHeader(context, snapshot.event.version);
    return context.json(snapshot, status);
  }

  return app;
}

async function readJson(request: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Request body must be valid JSON.", 400);
  }
}

function setEventVersionHeader(
  context: { header(name: string, value: string): void },
  version: number,
): void {
  context.header("ETag", `"v${version}"`);
}
