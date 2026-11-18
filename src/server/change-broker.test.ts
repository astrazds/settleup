import { getEventListeners } from "node:events";

import { describe, expect, it } from "vitest";

import { ChangeBroker } from "./change-broker.js";

describe("ChangeBroker", () => {
  it("streams event change notifications to subscribers", async () => {
    const broker = new ChangeBroker();
    const abort = new AbortController();
    const stream = broker.subscribe("event-1", abort.signal);
    const reader = stream.getReader();

    const connected = await reader.read();
    expect(decode(connected.value)).toContain("event: connected");

    broker.publish({ eventId: "event-1", version: 3 });
    const changed = await reader.read();
    expect(decode(changed.value)).toContain('data: {"version":3}');

    abort.abort();
    reader.releaseLock();
  });

  it("finishes a pending read when the request aborts", async () => {
    const broker = new ChangeBroker();
    const abort = new AbortController();
    const reader = broker.subscribe("event-1", abort.signal).getReader();
    await reader.read();
    const pending = reader.read();

    abort.abort();

    await expect(Promise.race([pending, Promise.resolve("still open")])).resolves.toEqual({
      done: true,
      value: undefined,
    });
    expect(getEventListeners(abort.signal, "abort")).toHaveLength(0);
  });

  it("closes a pre-aborted subscription without sending a frame", async () => {
    const broker = new ChangeBroker();
    const signal = AbortSignal.abort();
    const reader = broker.subscribe("event-1", signal).getReader();

    broker.publish({ eventId: "event-1", version: 3 });

    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined });
    expect(getEventListeners(signal, "abort")).toHaveLength(0);
  });

  it("detaches on body cancellation and lets the event reconnect", async () => {
    const broker = new ChangeBroker();
    const abort = new AbortController();
    const stream = broker.subscribe("event-1", abort.signal);

    await stream.cancel();

    expect(getEventListeners(abort.signal, "abort")).toHaveLength(0);
    const reconnect = new AbortController();
    const reader = broker.subscribe("event-1", reconnect.signal).getReader();
    expect(decode((await reader.read()).value)).toBe("event: connected\ndata: {}\n\n");

    abort.abort();
    broker.publish({ eventId: "event-2", version: 2 });
    broker.publish({ eventId: "event-1", version: 3 });

    expect(decode((await reader.read()).value)).toBe('event: changed\ndata: {"version":3}\n\n');
    reconnect.abort();
  });
});

function decode(value: Uint8Array | undefined): string {
  if (!value) {
    throw new Error("Expected stream chunk.");
  }

  return new TextDecoder().decode(value);
}
