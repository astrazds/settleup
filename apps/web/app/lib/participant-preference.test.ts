import {
  getParticipantPreference,
  setParticipantPreference,
} from "./participant-preference";

describe("participant preference", () => {
  const event = {
    id: "public-event-id",
    token: "private-event-token",
  };

  it("stores only a participant ID under a key derived from event.id", () => {
    setParticipantPreference(event, "participant-id");

    expect(window.sessionStorage).toHaveLength(1);
    expect(window.sessionStorage.key(0)).toBe(
      "settleup:participant:public-event-id",
    );
    expect(window.sessionStorage.getItem(window.sessionStorage.key(0)!)).toBe(
      "participant-id",
    );
    expect(JSON.stringify(window.sessionStorage)).not.toContain(
      "private-event-token",
    );
  });

  it("reads a valid stored participant", () => {
    setParticipantPreference(event, "participant-id");

    expect(
      getParticipantPreference(event, [
        { id: "participant-id" },
        { id: "someone-else" },
      ]),
    ).toBe("participant-id");
  });

  it("clears a stored participant that is no longer in the event", () => {
    setParticipantPreference(event, "removed-participant");

    expect(
      getParticipantPreference(event, [{ id: "current-participant" }]),
    ).toBeNull();
    expect(window.sessionStorage).toHaveLength(0);
  });

  it("fails softly when session storage is unavailable", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new DOMException("blocked");
      },
      removeItem: () => {
        throw new DOMException("blocked");
      },
      setItem: () => {
        throw new DOMException("blocked");
      },
    } as unknown as Storage;

    expect(
      getParticipantPreference(event, undefined, unavailableStorage),
    ).toBeNull();
    expect(() =>
      setParticipantPreference(event, "participant-id", unavailableStorage),
    ).not.toThrow();
  });
});
