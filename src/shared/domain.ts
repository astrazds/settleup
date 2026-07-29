export const currencyCodes = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;

export type CurrencyCode = (typeof currencyCodes)[number];

export interface EventSummary {
  id: string;
  title: string;
  currency: CurrencyCode;
  createdAt: string;
  expiresAt: string;
  cleanupAfter: string;
  version: number;
  token: string;
}

export interface Participant {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ExpenseShare {
  participantId: string;
  amountMinor: number;
}

export interface Expense {
  id: string;
  description: string;
  amountMinor: number;
  payerId: string;
  shares: ExpenseShare[];
  createdAt: string;
  updatedAt: string;
}

export interface SettlementPayment {
  id: string;
  from: string;
  to: string;
  amountMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  participantId: string;
  paidMinor: number;
  owedMinor: number;
  netMinor: number;
}

export interface SettlementSuggestion {
  from: string;
  to: string;
  amountMinor: number;
}

export interface EventSnapshot {
  event: EventSummary;
  participants: Participant[];
  expenses: Expense[];
  payments: SettlementPayment[];
  balances: Balance[];
  settlementSuggestion: SettlementSuggestion | null;
}

export function assertCurrencyCode(value: string): CurrencyCode {
  if (currencyCodes.includes(value as CurrencyCode)) {
    return value as CurrencyCode;
  }

  throw new Error(`Unsupported currency: ${value}`);
}

export function deriveEqualShares(amountMinor: number, participantIds: string[]): ExpenseShare[] {
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

export function calculateBalances(
  participants: Participant[],
  expenses: Expense[],
  payments: SettlementPayment[],
): Balance[] {
  const ledger = new Map<string, Balance>();

  for (const participant of participants) {
    ledger.set(participant.id, {
      participantId: participant.id,
      paidMinor: 0,
      owedMinor: 0,
      netMinor: 0,
    });
  }

  for (const expense of expenses) {
    const payer = ledger.get(expense.payerId);
    if (payer) {
      payer.paidMinor += expense.amountMinor;
    }

    for (const share of expense.shares) {
      const participant = ledger.get(share.participantId);
      if (participant) {
        participant.owedMinor += share.amountMinor;
      }
    }
  }

  for (const row of ledger.values()) {
    row.netMinor = row.paidMinor - row.owedMinor;
  }

  for (const payment of payments) {
    const sender = ledger.get(payment.from);
    const receiver = ledger.get(payment.to);

    if (sender) {
      sender.netMinor += payment.amountMinor;
    }

    if (receiver) {
      receiver.netMinor -= payment.amountMinor;
    }
  }

  return participants.map((participant) => {
    const row = ledger.get(participant.id);
    if (!row) {
      throw new Error(`Missing balance row for participant ${participant.id}`);
    }

    return row;
  });
}

export function getSettlementSuggestion(balances: Balance[]): SettlementSuggestion | null {
  const openRows = balances.filter((row) => Math.abs(row.netMinor) > 0);
  const debtor = [...openRows].sort((left, right) => left.netMinor - right.netMinor)[0];
  const creditor = [...openRows].sort((left, right) => right.netMinor - left.netMinor)[0];

  if (!debtor || !creditor || debtor.netMinor >= 0 || creditor.netMinor <= 0) {
    return null;
  }

  return {
    from: debtor.participantId,
    to: creditor.participantId,
    amountMinor: Math.min(Math.abs(debtor.netMinor), creditor.netMinor),
  };
}
