import type {
  CreateEventResponse,
  EventSnapshot,
} from "@settleup/contracts";

import {
  ApiError,
  createEvent,
  deleteExpense,
  getEvent,
} from "./api";

const snapshot: EventSnapshot = {
  event: {
    cleanupAfter: "2026-08-03T00:00:00.000Z",
    createdAt: "2026-07-29T00:00:00.000Z",
    currency: "AUD",
    expiresAt: "2026-08-01T00:00:00.000Z",
    id: "event-id",
    title: "Weekend away",
    token: "private-token",
    version: 1,
  },
  participants: [
    {
      id: "participant-id",
      name: "Mia",
      sortOrder: 0,
    },
  ],
  expenses: [],
  payments: [],
  balances: [
    {
      netMinor: 0,
      owedMinor: 0,
      paidMinor: 0,
      participantId: "participant-id",
    },
  ],
  settlementSuggestion: null,
};

const createdEvent: CreateEventResponse = {
  snapshot,
  token: "private-token",
};

describe("API adapter", () => {
  it("uses relative API paths, omits credentials, and validates request and response data", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(jsonResponse(createdEvent, 201)),
    );

    await expect(
      createEvent(
        {
          currency: "AUD",
          firstParticipantName: "  Mia  ",
          title: "  Weekend away  ",
        },
        { fetch: fetcher },
      ),
    ).resolves.toEqual(createdEvent);

    expect(fetcher).toHaveBeenCalledOnce();
    const [path, init] = fetcher.mock.calls[0] ?? [];
    expect(path).toBe("/api/events");
    expect(init).toMatchObject({
      cache: "no-store",
      credentials: "omit",
      method: "POST",
    });
    if (typeof init?.body !== "string") {
      throw new TypeError("Expected a JSON string request body.");
    }

    const requestBody: unknown = JSON.parse(init.body);
    expect(requestBody).toEqual({
      currency: "AUD",
      firstParticipantName: "Mia",
      title: "Weekend away",
    });
  });

  it("encodes private tokens and resource IDs as individual path segments", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(jsonResponse(snapshot)),
    );

    await deleteExpense("secret/token", "expense/id", {
      expectedVersion: 3,
      fetch: fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [path, init] = fetcher.mock.calls[0] ?? [];
    expect(path).toBe(
      "/api/events/secret%2Ftoken/expenses/expense%2Fid",
    );
    expect(init?.method).toBe("DELETE");
    expect(new Headers(init?.headers).get("If-Match")).toBe('"v3"');
  });

  it.each([
    {
      expectedKind: "bad-request",
      message: "description is required.",
      status: 400,
    },
    {
      expectedKind: "not-found",
      message: "Event not found.",
      status: 404,
    },
    {
      expectedKind: "expired",
      message: "This event has expired.",
      status: 410,
    },
    {
      expectedKind: "conflict",
      message: "This event changed.",
      status: 412,
    },
    {
      expectedKind: "server",
      message: "Internal server error.",
      status: 500,
    },
  ] as const)(
    "maps a $status response to $expectedKind",
    async ({ expectedKind, message, status }) => {
      const fetcher = vi.fn<typeof fetch>(
        () => Promise.resolve(jsonResponse({ error: message }, status)),
      );

      const error = await getEvent("token", { fetch: fetcher }).catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        kind: expectedKind,
        message,
        status,
      });
    },
  );

  it("maps rejected fetches to a network error", async () => {
    const cause = new TypeError("fetch failed");
    const fetcher = vi.fn<typeof fetch>(() => Promise.reject(cause));

    const error = await getEvent("token", { fetch: fetcher }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      cause,
      kind: "network",
      status: null,
    });
  });

  it("maps invalid successful payloads to a server contract error", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(jsonResponse({})),
    );

    const error = await getEvent("token", { fetch: fetcher }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: "server",
      status: 200,
    });
  });

  it("rejects invalid commands before sending a request", async () => {
    const fetcher = vi.fn<typeof fetch>();

    const error = await createEvent(
      {
        currency: "AUD",
        firstParticipantName: "Mia",
        title: "",
      },
      { fetch: fetcher },
    ).catch((caught: unknown) => caught);

    expect(fetcher).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: "bad-request",
      message: "title is required.",
      status: 400,
    });
  });

  it("rejects an invalid expected version before sending a request", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(
      deleteExpense("token", "expense", {
        expectedVersion: 0,
        fetch: fetcher,
      }),
    ).rejects.toMatchObject({
      kind: "bad-request",
      status: 400,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses a safe fallback when an error response is not JSON", async () => {
    const fetcher = vi.fn<typeof fetch>(
      () => Promise.resolve(new Response("not json", { status: 404 })),
    );

    await expect(getEvent("token", { fetch: fetcher })).rejects.toMatchObject({
      kind: "not-found",
      message: "This event or item could not be found.",
      status: 404,
    });
  });
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
