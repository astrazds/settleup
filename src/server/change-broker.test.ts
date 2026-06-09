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
});

function decode(value: Uint8Array | undefined): string {
  if (!value) {
    throw new Error("Expected stream chunk.");
  }

  return new TextDecoder().decode(value);
}
