import { describe, expect, it } from "vitest";

import { openDatabase } from "./database.js";
import { AppError } from "./errors.js";
import { EventService } from "./event-service.js";

describe("EventService", () => {
  it("creates event-scoped expenses, balances, suggestions, and settlement payments", () => {
    const service = new EventService(openDatabase(":memory:"));
    const created = service.createEvent({
      title: "Dinner",
      currency: "AUD",
      firstParticipantName: "Andrejs",
    });
    let snapshot = service.addParticipant(created.token, { name: "Mia" });
    const andrejs = participantId(snapshot, "Andrejs");
    const mia = participantId(snapshot, "Mia");

    snapshot = service.createExpense(created.token, {
      description: "Pizza",
      amountMinor: 3000,
      payerId: andrejs,
      includedParticipantIds: [andrejs, mia],
    });

    expect(balanceFor(snapshot, andrejs).netMinor).toBe(1500);
    expect(balanceFor(snapshot, mia).netMinor).toBe(-1500);
    expect(snapshot.settlementSuggestion).toEqual({
      amountMinor: 1500,
      from: mia,
      to: andrejs,
    });

    snapshot = service.createPayment(created.token, {
      amountMinor: 1500,
      from: mia,
      to: andrejs,
    });

    expect(balanceFor(snapshot, andrejs).netMinor).toBe(0);
    expect(balanceFor(snapshot, mia).netMinor).toBe(0);
    expect(snapshot.settlementSuggestion).toBeNull();
  });

  it("rejects invalid expense participants without changing saved event version", () => {
    const service = new EventService(openDatabase(":memory:"));
    const created = service.createEvent({
      title: "Trip",
      currency: "AUD",
      firstParticipantName: "Andrejs",
    });
    const before = created.snapshot;
    const andrejs = participantId(before, "Andrejs");

    expect(() => service.createExpense(created.token, {
      description: "Fuel",
      amountMinor: 5000,
      payerId: andrejs,
      includedParticipantIds: [andrejs, "not-in-this-event"],
    })).toThrow(AppError);

    const after = service.getSnapshotByToken(created.token);
    expect(after.event.version).toBe(before.event.version);
    expect(after.expenses).toHaveLength(0);
  });

  it("only deletes unreferenced participants", () => {
    const service = new EventService(openDatabase(":memory:"));
    const created = service.createEvent({
      title: "House",
      currency: "AUD",
      firstParticipantName: "Andrejs",
    });
    let snapshot = service.addParticipant(created.token, { name: "Mia" });
    snapshot = service.addParticipant(created.token, { name: "Sam" });
    const andrejs = participantId(snapshot, "Andrejs");
    const mia = participantId(snapshot, "Mia");
    const sam = participantId(snapshot, "Sam");

    snapshot = service.createExpense(created.token, {
      description: "Groceries",
      amountMinor: 1200,
      payerId: andrejs,
      includedParticipantIds: [andrejs, mia],
    });

    expect(() => service.deleteParticipant(created.token, mia)).toThrow(AppError);
    snapshot = service.deleteParticipant(created.token, sam);
    expect(snapshot.participants.map((participant) => participant.name)).toEqual(["Andrejs", "Mia"]);
  });

  it("keeps at least one participant", () => {
    const service = new EventService(openDatabase(":memory:"));
    const created = service.createEvent({
      title: "House",
      currency: "AUD",
      firstParticipantName: "Andrejs",
    });
    const andrejs = participantId(created.snapshot, "Andrejs");

    expect(() => service.deleteParticipant(created.token, andrejs)).toThrow(AppError);
  });

  it("rejects aggregate amounts that cannot be calculated exactly", () => {
    const db = openDatabase(":memory:");
    const service = new EventService(db);
    const created = service.createEvent({
      title: "Large event",
      currency: "AUD",
      firstParticipantName: "Andrejs",
    });
    let snapshot = service.addParticipant(created.token, { name: "Mia" });
    const andrejs = participantId(snapshot, "Andrejs");
    const mia = participantId(snapshot, "Mia");
    snapshot = service.createExpense(created.token, {
      description: "Large expense",
      amountMinor: Number.MAX_SAFE_INTEGER - 1,
      payerId: andrejs,
      includedParticipantIds: [andrejs],
    });
    const expenseId = snapshot.expenses[0]?.id;
    if (!expenseId) {
      throw new Error("Missing large expense.");
    }

    snapshot = service.createPayment(created.token, {
      amountMinor: 1,
      from: mia,
      to: andrejs,
    });
    const paymentId = snapshot.payments[0]?.id;
    if (!paymentId) {
      throw new Error("Missing settlement payment.");
    }

    snapshot = service.updateExpense(created.token, expenseId, {
      description: "Updated large expense",
      amountMinor: Number.MAX_SAFE_INTEGER - 1,
      payerId: andrejs,
      includedParticipantIds: [andrejs],
    });
    snapshot = service.updatePayment(created.token, paymentId, {
      amountMinor: 1,
      from: mia,
      to: andrejs,
    });
    const versionBeforeRejectedWrites = snapshot.event.version;

    const exactnessError = expect.objectContaining({
      message: "The combined event amount is too large to calculate exactly.",
      status: 400,
    });
    expect(() => service.createExpense(created.token, {
      description: "One more cent",
      amountMinor: 1,
      payerId: andrejs,
      includedParticipantIds: [andrejs],
    })).toThrow(exactnessError);
    expect(() => service.updateExpense(created.token, expenseId, {
      description: "Too-large update",
      amountMinor: Number.MAX_SAFE_INTEGER,
      payerId: andrejs,
      includedParticipantIds: [andrejs],
    })).toThrow(exactnessError);
    expect(() => service.createPayment(created.token, {
      amountMinor: 1,
      from: mia,
      to: andrejs,
    })).toThrow(exactnessError);
    expect(() => service.updatePayment(created.token, paymentId, {
      amountMinor: 2,
      from: mia,
      to: andrejs,
    })).toThrow(
      expect.objectContaining({
        message: "The combined event amount is too large to calculate exactly.",
        status: 400,
      }),
    );

    const unchanged = service.getSnapshotByToken(created.token);
    expect(unchanged.event.version).toBe(versionBeforeRejectedWrites);
    expect(unchanged.expenses).toHaveLength(1);
    expect(unchanged.payments).toHaveLength(1);

    db.prepare(
      `
      INSERT INTO settlement_payments
        (id, event_id, from_participant_id, to_participant_id, amount_minor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-overflow-payment",
      unchanged.event.id,
      mia,
      andrejs,
      1,
      unchanged.event.createdAt,
      unchanged.event.createdAt,
    );

    expect(() => service.getSnapshotByToken(created.token)).toThrow(
      "Stored event amounts exceed the exact safe-integer range.",
    );
    expect(() =>
      service.renameParticipant(created.token, andrejs, {
        name: "Changed after legacy overflow",
      }),
    ).toThrow("Stored event amounts exceed the exact safe-integer range.");
    expect(
      db
        .prepare("SELECT name FROM participants WHERE id = ?")
        .get(andrejs),
    ).toEqual({ name: "Andrejs" });
    expect(
      db
        .prepare("SELECT version FROM events WHERE id = ?")
        .get(unchanged.event.id),
    ).toEqual({ version: versionBeforeRejectedWrites });
  });

  it("stops resolving expired events and deletes them after cleanup retention", () => {
    let now = new Date("2026-06-01T00:00:00.000Z");
    const service = new EventService(openDatabase(":memory:"), () => now);
    const created = service.createEvent({
      title: "Weekend",
      currency: "AUD",
      firstParticipantName: "Andrejs",
    });

    now = new Date("2026-06-04T00:00:01.000Z");
    expect(() => service.getSnapshotByToken(created.token)).toThrow(AppError);

    now = new Date("2026-06-06T00:00:01.000Z");
    expect(service.cleanupExpiredData()).toBe(1);
    expect(() => service.getSnapshotByToken(created.token)).toThrow(AppError);
  });
});

function participantId(snapshot: { participants: { id: string; name: string }[] }, name: string): string {
  const participant = snapshot.participants.find((item) => item.name === name);
  if (!participant) {
    throw new Error(`Missing participant ${name}`);
  }

  return participant.id;
}

function balanceFor(
  snapshot: { balances: { netMinor: number; participantId: string }[] },
  participantId: string,
) {
  const balance = snapshot.balances.find((item) => item.participantId === participantId);
  if (!balance) {
    throw new Error(`Missing balance for ${participantId}`);
  }

  return balance;
}
