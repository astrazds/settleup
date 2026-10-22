import type { ExpenseShare } from "./index.js";

export function deriveEqualShares(
  amountMinor: number,
  participantIds: readonly string[],
): ExpenseShare[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Amount must be a positive integer minor-unit value.");
  }

  if (participantIds.length === 0) {
    throw new Error("At least one participant must be included.");
  }

  const baseShare = Math.floor(amountMinor / participantIds.length);
  let remainder = amountMinor % participantIds.length;

  return participantIds.map((participantId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return {
      participantId,
      amountMinor: baseShare + extra,
    };
  });
}
