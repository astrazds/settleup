import { Hono } from "hono";

import { ChangeBroker } from "./change-broker.js";
import { AppError } from "./errors.js";
import {
  EventService,
  type ExpenseCommand,
  type PaymentCommand,
} from "./event-service.js";
import {
  asObject,
  readCurrency,
  readPositiveInteger,
  readString,
  readStringArray,
  trimRequired,
} from "./validation.js";

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

  app.onError((error, context) => {
    if (error instanceof AppError) {
      return context.json({ error: error.message }, error.status);
    }

    console.error(error);
    return context.json({ error: "Internal server error." }, 500);
  });

  app.post("/api/events", async (context) => {
    const body = asObject(await readJson(context.req));
    const result = service.createEvent({
      title: trimRequired(readString(body, "title"), "title"),
      currency: readCurrency(body),
      firstParticipantName: trimRequired(readString(body, "firstParticipantName"), "firstParticipantName"),
    });
    return context.json(result, 201);
  });

  app.get("/api/events/:token", (context) => {
    return context.json(service.getSnapshotByToken(context.req.param("token")));
  });

  app.get("/api/events/:token/stream", (context) => {
    const snapshot = service.getSnapshotByToken(context.req.param("token"));
    const stream = broker.subscribe(snapshot.event.id, context.req.raw.signal);
    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream",
      },
    });
  });

  app.post("/api/events/:token/participants", async (context) => {
    const token = context.req.param("token");
    const body = asObject(await readJson(context.req));
    const snapshot = service.addParticipant(token, {
      name: trimRequired(readString(body, "name"), "name"),
    });
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot, 201);
  });

  app.patch("/api/events/:token/participants/:participantId", async (context) => {
    const token = context.req.param("token");
    const body = asObject(await readJson(context.req));
    const snapshot = service.renameParticipant(token, context.req.param("participantId"), {
      name: trimRequired(readString(body, "name"), "name"),
    });
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot);
  });

  app.delete("/api/events/:token/participants/:participantId", (context) => {
    const snapshot = service.deleteParticipant(
      context.req.param("token"),
      context.req.param("participantId"),
    );
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot);
  });

  app.post("/api/events/:token/expenses", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.createExpense(token, parseExpenseCommand(await readJson(context.req)));
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot, 201);
  });

  app.patch("/api/events/:token/expenses/:expenseId", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.updateExpense(
      token,
      context.req.param("expenseId"),
      parseExpenseCommand(await readJson(context.req)),
    );
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot);
  });

  app.delete("/api/events/:token/expenses/:expenseId", (context) => {
    const snapshot = service.deleteExpense(context.req.param("token"), context.req.param("expenseId"));
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot);
  });

  app.post("/api/events/:token/payments", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.createPayment(token, parsePaymentCommand(await readJson(context.req)));
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot, 201);
  });

  app.patch("/api/events/:token/payments/:paymentId", async (context) => {
    const token = context.req.param("token");
    const snapshot = service.updatePayment(
      token,
      context.req.param("paymentId"),
      parsePaymentCommand(await readJson(context.req)),
    );
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot);
  });

  app.delete("/api/events/:token/payments/:paymentId", (context) => {
    const snapshot = service.deletePayment(context.req.param("token"), context.req.param("paymentId"));
    publishSnapshot(broker, snapshot.event.id, snapshot.event.version);
    return context.json(snapshot);
  });

  return app;
}

async function readJson(request: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Request body must be valid JSON.", 400);
  }
}

function parseExpenseCommand(value: unknown): ExpenseCommand {
  const body = asObject(value);
  return {
    description: trimRequired(readString(body, "description"), "description"),
    amountMinor: readPositiveInteger(body, "amountMinor"),
    payerId: trimRequired(readString(body, "payerId"), "payerId"),
    includedParticipantIds: readStringArray(body, "includedParticipantIds"),
  };
}

function parsePaymentCommand(value: unknown): PaymentCommand {
  const body = asObject(value);
  return {
    from: trimRequired(readString(body, "from"), "from"),
    to: trimRequired(readString(body, "to"), "to"),
    amountMinor: readPositiveInteger(body, "amountMinor"),
  };
}

function publishSnapshot(broker: ChangeBroker, eventId: string, version: number): void {
  broker.publish({ eventId, version });
}
