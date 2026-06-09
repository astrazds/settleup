import { describe, expect, it } from "vitest";

import type { EventSnapshot } from "../shared/domain.js";
import { createApp } from "./app.js";
import { openDatabase } from "./database.js";
import { EventService } from "./event-service.js";

describe("API app", () => {
  it("creates an event and accepts command-style expense and payment mutations", async () => {
    const app = createApp({ service: new EventService(openDatabase(":memory:")) });
    const created = await jsonRequest<{ token: string; snapshot: EventSnapshot }>(app, "/api/events", {
      body: {
        currency: "AUD",
        firstParticipantName: "Andrejs",
        title: "Beach house",
      },
      method: "POST",
      status: 201,
    });
    let snapshot = created.snapshot;

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/participants`, {
      body: { name: "Mia" },
      method: "POST",
      status: 201,
    });

    const andrejs = participantId(snapshot, "Andrejs");
    const mia = participantId(snapshot, "Mia");

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/expenses`, {
      body: {
        amountMinor: 4000,
        description: "Dinner",
        includedParticipantIds: [andrejs, mia],
        payerId: andrejs,
      },
      method: "POST",
      status: 201,
    });

    expect(snapshot.expenses).toHaveLength(1);
    const expenseId = snapshot.expenses[0]?.id;
    expect(expenseId).toBeDefined();
    expect(snapshot.settlementSuggestion).toEqual({
      amountMinor: 2000,
      from: mia,
      to: andrejs,
    });

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/expenses/${expenseId}`, {
      body: {
        amountMinor: 5000,
        description: "Dinner and dessert",
        includedParticipantIds: [andrejs, mia],
        payerId: andrejs,
      },
      method: "PATCH",
      status: 200,
    });

    expect(snapshot.expenses[0]?.description).toBe("Dinner and dessert");
    expect(snapshot.settlementSuggestion?.amountMinor).toBe(2500);

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/payments`, {
      body: {
        amountMinor: 2500,
        from: mia,
        to: andrejs,
      },
      method: "POST",
      status: 201,
    });

    expect(snapshot.payments).toHaveLength(1);
    expect(snapshot.settlementSuggestion).toBeNull();

    const paymentId = snapshot.payments[0]?.id;
    expect(paymentId).toBeDefined();

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/payments/${paymentId}`, {
      body: {},
      method: "DELETE",
      status: 200,
    });

    expect(snapshot.payments).toHaveLength(0);
    expect(snapshot.settlementSuggestion?.amountMinor).toBe(2500);

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/expenses/${expenseId}`, {
      body: {},
      method: "DELETE",
      status: 200,
    });

    expect(snapshot.expenses).toHaveLength(0);
    expect(snapshot.settlementSuggestion).toBeNull();
  });

  it("returns validation errors for malformed command bodies", async () => {
    const app = createApp({ service: new EventService(openDatabase(":memory:")) });
    const response = await app.request("/api/events", {
      body: JSON.stringify({
        currency: "CAD",
        firstParticipantName: "Andrejs",
        title: "Trip",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "currency must be one of AUD, USD, EUR, GBP, or NZD.",
    });
  });
});

async function jsonRequest<T>(
  app: ReturnType<typeof createApp>,
  path: string,
  options: { body: unknown; method: string; status: number },
): Promise<T> {
  const response = await app.request(path, {
    body: JSON.stringify(options.body),
    headers: { "Content-Type": "application/json" },
    method: options.method,
  });

  expect(response.status).toBe(options.status);
  return await response.json() as T;
}

function participantId(snapshot: EventSnapshot, name: string): string {
  const participant = snapshot.participants.find((item) => item.name === name);
  if (!participant) {
    throw new Error(`Missing participant ${name}`);
  }

  return participant.id;
}
