import { eventSnapshotSchema } from "@settleup/contracts";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { openDatabase } from "./database.js";
import { EventService } from "./event-service.js";

describe("event mutation contract", () => {
  for (const resource of ["participants", "expenses", "payments"] as const) {
    for (const method of ["POST", "PATCH", "DELETE"] as const) {
      it(`${method} ${resource} rejects stale writes and publishes the committed snapshot version`, async () => {
        const db = openDatabase(":memory:");
        const controller = new AbortController();

        try {
          const service = new EventService(db);
          const app = createApp({ service });
          const { token } = service.createEvent({
            title: "Trip",
            currency: "AUD",
            firstParticipantName: "Mia",
          });
          service.addParticipant(token, { name: "Noah" });
          const people = service.addParticipant(token, { name: "Sam" });
          const [mia, noah, sam] = people.participants;
          if (!mia || !noah || !sam) throw new Error("Missing fixture participants.");
          const expenseCommand = {
            description: "Dinner",
            amountMinor: 1001,
            payerId: mia.id,
            includedParticipantIds: [mia.id, noah.id],
          };
          const paymentCommand = { from: noah.id, to: mia.id, amountMinor: 100 };
          service.createExpense(token, expenseCommand);
          const before = service.createPayment(token, paymentCommand);
          const [expense] = before.expenses;
          const [payment] = before.payments;
          if (!expense || !payment) throw new Error("Missing fixture ledger.");
          const other = service.createEvent({
            title: "Other event",
            currency: "AUD",
            firstParticipantName: "Alex",
          });
          const commands = {
            participants: { name: "Sam updated" },
            expenses: { ...expenseCommand, amountMinor: 1003 },
            payments: { ...paymentCommand, amountMinor: 200 },
          };
          const ids = { participants: sam.id, expenses: expense.id, payments: payment.id };
          const path = `/api/events/${token}/${resource}${method === "POST" ? "" : `/${ids[resource]}`}`;
          const stream = await app.request(`/api/events/${token}/stream`, {
            signal: controller.signal,
          });
          const reader = stream.body?.getReader();
          if (!reader) throw new Error("Missing event stream.");
          await reader.read();

          const send = (version: number) => app.request(path, {
            method,
            headers: {
              "Content-Type": "application/json",
              "If-Match": `"v${version}"`,
            },
            body: method === "DELETE" ? undefined : JSON.stringify(commands[resource]),
          });

          const stale = await send(before.event.version - 1);
          expect(stale.status).toBe(412);
          expect(service.getSnapshotByToken(token)).toEqual(before);

          const response = await send(before.event.version);
          expect(response.status).toBe(method === "POST" ? 201 : 200);
          const after = eventSnapshotSchema.parse(await response.json());
          expect(after.event.version).toBe(before.event.version + 1);
          expect(response.headers.get("ETag")).toBe(`"v${after.event.version}"`);
          expect(response.headers.get("Cache-Control")).toBe("no-store");
          expect(after).toEqual(service.getSnapshotByToken(token));
          expect(after.balances.reduce((sum, balance) => sum + balance.netMinor, 0)).toBe(0);
          expect(service.getSnapshotByToken(other.token)).toEqual(other.snapshot);
          const change = await reader.read();
          expect(new TextDecoder().decode(change.value)).toBe(
            `event: changed\ndata: ${JSON.stringify({ version: after.event.version })}\n\n`,
          );
        } finally {
          controller.abort();
          db.close();
        }
      });
    }
  }

  it("rolls back ledger changes when the version write fails", () => {
    const db = openDatabase(":memory:");
    try {
      const service = new EventService(db);
      const { token, snapshot } = service.createEvent({
        title: "Trip",
        currency: "AUD",
        firstParticipantName: "Mia",
      });
      db.exec(`
        CREATE TRIGGER reject_version BEFORE UPDATE OF version ON events
        BEGIN SELECT RAISE(ABORT, 'version write failed'); END;
      `);
      expect(() => service.addParticipant(token, { name: "Noah" })).toThrow("version write failed");
      expect(service.getSnapshotByToken(token)).toEqual(snapshot);
    } finally {
      db.close();
    }
  });

  it("preserves body, header, and domain errors ahead of stale version errors", async () => {
    const db = openDatabase(":memory:");
    try {
      const service = new EventService(db);
      const app = createApp({ service });
      const { token } = service.createEvent({ title: "Trip", currency: "AUD", firstParticipantName: "Mia" });
      const before = service.addParticipant(token, { name: "Noah" });
      const [mia] = before.participants;
      if (!mia) throw new Error("Missing fixture participant.");
      const cases = [
        { path: "participants", method: "POST", body: "{", tag: "invalid", status: 400, error: "Request body must be valid JSON." },
        { path: "participants", method: "POST", body: JSON.stringify({ name: "" }), tag: "invalid", status: 400, error: "name is required." },
        { path: "participants/missing", method: "DELETE", body: undefined, tag: "invalid", status: 400, error: 'If-Match must contain valid entity tags such as "v3", or *.' },
        { path: "participants/missing", method: "DELETE", body: undefined, tag: '"v1"', status: 400, error: "Participant does not belong to this event." },
        { path: "expenses/missing", method: "DELETE", body: undefined, tag: '"v1"', status: 404, error: "Expense not found." },
        { path: "payments/missing", method: "DELETE", body: undefined, tag: '"v1"', status: 404, error: "Settlement payment not found." },
        { path: "payments", method: "POST", body: JSON.stringify({ from: mia.id, to: mia.id, amountMinor: 1 }), tag: '"v1"', status: 400, error: "Settlement payment participants must be different." },
      ];
      for (const testCase of cases) {
        const response = await app.request(`/api/events/${token}/${testCase.path}`, {
          method: testCase.method,
          body: testCase.body,
          headers: { "Content-Type": "application/json", "If-Match": testCase.tag },
        });
        expect(response.status).toBe(testCase.status);
        expect(await response.json()).toEqual({ error: testCase.error });
        expect(service.getSnapshotByToken(token)).toEqual(before);
      }
    } finally {
      db.close();
    }
  });
});
