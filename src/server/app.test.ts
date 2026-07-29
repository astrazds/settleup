import { describe, expect, it } from "vitest";
import {
  apiErrorResponseSchema,
  createEventResponseSchema,
  eventSnapshotSchema,
} from "@settleup/contracts";

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

    expect(createEventResponseSchema.parse(created)).toEqual(created);

    snapshot = await jsonRequest<EventSnapshot>(app, `/api/events/${created.token}/participants`, {
      body: { name: "Mia" },
      method: "POST",
      status: 201,
    });

    expect(snapshot.participants.every((participant) => (
      !("initials" in participant) && !("color" in participant)
    ))).toBe(true);

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
    expect(eventSnapshotSchema.parse(snapshot)).toEqual(snapshot);
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
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(apiErrorResponseSchema.parse(await response.json())).toEqual({
      error: "currency must be one of AUD, USD, EUR, GBP, or NZD.",
    });
  });

  it("preserves request validation messages through the shared schemas", async () => {
    const app = createApp({ service: new EventService(openDatabase(":memory:")) });

    const cases = [
      {
        body: [],
        error: "Request body must be a JSON object.",
      },
      {
        body: {
          currency: "AUD",
          firstParticipantName: "Andrejs",
          title: "   ",
        },
        error: "title is required.",
      },
    ];

    for (const testCase of cases) {
      const response = await app.request("/api/events", {
        body: JSON.stringify(testCase.body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: testCase.error });
    }
  });

  it("evaluates If-Match preconditions without applying stale writes", async () => {
    const service = new EventService(openDatabase(":memory:"));
    const app = createApp({ service });
    const created = service.createEvent({
      currency: "AUD",
      firstParticipantName: "Mia",
      title: "Trip",
    });
    const path = `/api/events/${created.token}/participants`;
    const firstResponse = await app.request(path, {
      body: JSON.stringify({ name: "Noah" }),
      headers: {
        "Content-Type": "application/json",
        "If-Match": '"v1"',
      },
      method: "POST",
    });

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.headers.get("ETag")).toBe('"v2"');

    const wildcardResponse = await app.request(path, {
      body: JSON.stringify({ name: "Luca" }),
      headers: {
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      method: "POST",
    });

    expect(wildcardResponse.status).toBe(201);
    expect(wildcardResponse.headers.get("ETag")).toBe('"v3"');

    const listResponse = await app.request(path, {
      body: JSON.stringify({ name: "Kai" }),
      headers: {
        "Content-Type": "application/json",
        "If-Match": 'W/"v9", "other,tag", "v3"',
      },
      method: "POST",
    });

    expect(listResponse.status).toBe(201);
    expect(listResponse.headers.get("ETag")).toBe('"v4"');

    const staleResponse = await app.request(path, {
      body: JSON.stringify({ name: "Stale" }),
      headers: {
        "Content-Type": "application/json",
        "If-Match": '"v1", W/"v4"',
      },
      method: "POST",
    });

    expect(staleResponse.status).toBe(412);
    expect(staleResponse.headers.get("Cache-Control")).toBe("no-store");
    expect(await staleResponse.json()).toEqual({
      error:
        "This event changed before your update was saved. Load the latest version and try again.",
    });

    const malformedResponse = await app.request(path, {
      body: JSON.stringify({ name: "Malformed" }),
      headers: {
        "Content-Type": "application/json",
        "If-Match": "v4",
      },
      method: "POST",
    });

    expect(malformedResponse.status).toBe(400);
    expect(await malformedResponse.json()).toEqual({
      error: 'If-Match must contain valid entity tags such as "v3", or *.',
    });

    const snapshot = service.getSnapshotByToken(created.token);
    expect(snapshot.event.version).toBe(4);
    expect(snapshot.participants.map((participant) => participant.name)).toEqual([
      "Mia",
      "Noah",
      "Luca",
      "Kai",
    ]);
  });

  it("returns 404 for client routes", async () => {
    const app = createApp({ service: new EventService(openDatabase(":memory:")) });

    for (const path of ["/", "/e/legacy-token"]) {
      const response = await app.request(path);

      expect(response.status).toBe(404);
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    }
  });

  it("keeps private event streams uncached and out of search indexes", async () => {
    const service = new EventService(openDatabase(":memory:"));
    const app = createApp({ service });
    const created = service.createEvent({
      currency: "AUD",
      firstParticipantName: "Mia",
      title: "Trip",
    });
    const controller = new AbortController();

    const response = await app.request(
      `/api/events/${created.token}/stream`,
      { signal: controller.signal },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");

    controller.abort();
    await response.body?.cancel();
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
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return await response.json() as T;
}

function participantId(snapshot: EventSnapshot, name: string): string {
  const participant = snapshot.participants.find((item) => item.name === name);
  if (!participant) {
    throw new Error(`Missing participant ${name}`);
  }

  return participant.id;
}
