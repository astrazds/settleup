import { describe, expect, it } from "vitest";

import {
  apiErrorResponseSchema,
  changedEventDataSchema,
  createEventCommandSchema,
  expenseCommandSchema,
} from "./index.js";

describe("wire contracts", () => {
  it("normalizes command strings without coercing money", () => {
    expect(createEventCommandSchema.parse({
      currency: "AUD",
      firstParticipantName: "  Mia  ",
      title: "  Beach house  ",
    })).toEqual({
      currency: "AUD",
      firstParticipantName: "Mia",
      title: "Beach house",
    });

    expect(expenseCommandSchema.safeParse({
      amountMinor: "1250",
      description: "Dinner",
      includedParticipantIds: ["participant-1"],
      payerId: "participant-1",
    }).success).toBe(false);
  });

  it("exposes stable API error and version invalidation schemas", () => {
    expect(apiErrorResponseSchema.parse({ error: "Event not found." })).toEqual({
      error: "Event not found.",
    });
    expect(changedEventDataSchema.parse({ version: 2 })).toEqual({ version: 2 });
    expect(changedEventDataSchema.safeParse({ version: 0 }).success).toBe(false);
  });

  it.each([
    [createEventCommandSchema, [], "Request body must be a JSON object."],
    [
      createEventCommandSchema,
      { currency: "CAD", firstParticipantName: "Mia", title: "Trip" },
      "currency must be one of AUD, USD, EUR, GBP, or NZD.",
    ],
    [
      createEventCommandSchema,
      { currency: "AUD", firstParticipantName: "Mia", title: "   " },
      "title is required.",
    ],
    [
      expenseCommandSchema,
      {
        amountMinor: 100,
        description: "Dinner",
        includedParticipantIds: [42],
        payerId: "participant-1",
      },
      "includedParticipantIds must be an array of strings.",
    ],
    [
      expenseCommandSchema,
      {
        amountMinor: 100,
        description: "Dinner",
        includedParticipantIds: [],
        payerId: "participant-1",
      },
      "At least one participant must be included.",
    ],
    [
      expenseCommandSchema,
      {
        amountMinor: 100,
        description: "Dinner",
        includedParticipantIds: ["participant-1", "participant-1"],
        payerId: "participant-1",
      },
      "includedParticipantIds must not contain duplicates.",
    ],
  ])("keeps the API's first validation message", (schema, input, message) => {
    const result = schema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });
});
