export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; message: string }

export { formatMoney, parseMoney } from './money'

export const supportedCurrencies = ['AUD', 'USD', 'EUR', 'GBP', 'NZD'] as const
export type SupportedCurrency = (typeof supportedCurrencies)[number]

export interface EventSummary {
  id: string
  token: string
  title: string
  currency: string
  eventLinkPath: string
  createdAt: string
  updatedAt: string
}

export interface Participant {
  id: string
  displayName: string
  order: number
  createdAt: string
}

export interface Share {
  participantId: string
  amountMinor: number
}

export interface Expense {
  id: string
  description: string
  amountMinor: number
  payerParticipantId: string
  shares: Share[]
  createdAt: string
  updatedAt: string
}

export interface SettlementPayment {
  id: string
  senderParticipantId: string
  recipientParticipantId: string
  amountMinor: number
  createdAt: string
  updatedAt: string
}

export interface Balance {
  participantId: string
  amountMinor: number
}

export interface SuggestedSettlement {
  senderParticipantId: string
  recipientParticipantId: string
  amountMinor: number
}

export interface EventSnapshot {
  event: EventSummary
  participants: Participant[]
  expenses: Expense[]
  settlementPayments: SettlementPayment[]
  balances: Balance[]
  suggestedSettlements: SuggestedSettlement[]
}

export interface ExpenseInput {
  description: string
  amountMinor: number
  payerParticipantId: string
  shares: Share[]
}

export interface SettlementPaymentInput {
  senderParticipantId: string
  recipientParticipantId: string
  amountMinor: number
}

const tokenAlphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
const currencyPattern = /^[A-Z]{3}$/

export function trimRequired(value: unknown, fieldName: string): Result<string> {
  if (typeof value !== 'string') {
    return { ok: false, message: `${fieldName} is required` }
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { ok: false, message: `${fieldName} is required` }
  }

  return { ok: true, value: trimmed }
}

export function parseCurrency(value: unknown): Result<SupportedCurrency> {
  if (typeof value !== 'string') {
    return { ok: false, message: 'Currency is required' }
  }

  const currency = value.trim().toUpperCase()
  if (!currencyPattern.test(currency)) {
    return { ok: false, message: 'Currency must be a three-letter code' }
  }
  if (!isSupportedCurrency(currency)) {
    return { ok: false, message: 'Currency must be AUD, USD, EUR, GBP, or NZD' }
  }

  return { ok: true, value: currency }
}

function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return supportedCurrencies.includes(currency as SupportedCurrency)
}

export function createEventToken(random = secureRandom, length = 18): string {
  let token = ''
  for (let index = 0; index < length; index += 1) {
    token += tokenAlphabet[Math.floor(random() * tokenAlphabet.length)] ?? tokenAlphabet[0]
  }
  return token
}

function secureRandom(): number {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return (value[0] ?? 0) / 2 ** 32
}

export function calculateBalances(
  participants: Participant[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): Balance[] {
  const balances = new Map(participants.map((participant) => [participant.id, 0]))

  for (const expense of expenses) {
    balances.set(
      expense.payerParticipantId,
      (balances.get(expense.payerParticipantId) ?? 0) + expense.amountMinor
    )

    for (const share of expense.shares) {
      balances.set(share.participantId, (balances.get(share.participantId) ?? 0) - share.amountMinor)
    }
  }

  for (const settlementPayment of settlementPayments) {
    balances.set(
      settlementPayment.senderParticipantId,
      (balances.get(settlementPayment.senderParticipantId) ?? 0) + settlementPayment.amountMinor
    )
    balances.set(
      settlementPayment.recipientParticipantId,
      (balances.get(settlementPayment.recipientParticipantId) ?? 0) - settlementPayment.amountMinor
    )
  }

  return participants.map((participant) => ({
    participantId: participant.id,
    amountMinor: balances.get(participant.id) ?? 0
  }))
}

export function suggestSettlements(participants: Participant[], balances: Balance[]): SuggestedSettlement[] {
  const orderByParticipantId = new Map(participants.map((participant) => [participant.id, participant.order]))
  const debtors = balances
    .filter((balance) => balance.amountMinor < 0)
    .map((balance) => ({ participantId: balance.participantId, amountMinor: -balance.amountMinor }))
    .sort((left, right) => sortByAmountThenOrder(right, left, orderByParticipantId))
  const creditors = balances
    .filter((balance) => balance.amountMinor > 0)
    .map((balance) => ({ participantId: balance.participantId, amountMinor: balance.amountMinor }))
    .sort((left, right) => sortByAmountThenOrder(right, left, orderByParticipantId))

  const suggestions: SuggestedSettlement[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    if (!debtor || !creditor) {
      break
    }

    const amountMinor = Math.min(debtor.amountMinor, creditor.amountMinor)
    suggestions.push({
      senderParticipantId: debtor.participantId,
      recipientParticipantId: creditor.participantId,
      amountMinor
    })

    debtor.amountMinor -= amountMinor
    creditor.amountMinor -= amountMinor

    if (debtor.amountMinor === 0) {
      debtorIndex += 1
    }
    if (creditor.amountMinor === 0) {
      creditorIndex += 1
    }
  }

  return suggestions
}

export function validateExpenseInput(input: ExpenseInput, participants: Participant[]): Result<ExpenseInput> {
  const participantIds = new Set(participants.map((participant) => participant.id))

  if (!participantIds.has(input.payerParticipantId)) {
    return { ok: false, message: 'Payer must be an existing Participant' }
  }
  if (input.amountMinor <= 0) {
    return { ok: false, message: 'Expense amount must be positive' }
  }
  if (input.shares.length === 0) {
    return { ok: false, message: 'Expense requires at least one Share' }
  }

  const seen = new Set<string>()
  let shareTotal = 0
  for (const share of input.shares) {
    if (!participantIds.has(share.participantId)) {
      return { ok: false, message: 'Each Share must reference an existing Participant' }
    }
    if (seen.has(share.participantId)) {
      return { ok: false, message: 'Each Participant can have one Share per Expense' }
    }
    if (share.amountMinor <= 0) {
      return { ok: false, message: 'Shares must be positive' }
    }
    seen.add(share.participantId)
    shareTotal += share.amountMinor
  }

  if (shareTotal !== input.amountMinor) {
    return { ok: false, message: 'Shares must sum to the Expense amount' }
  }

  return { ok: true, value: input }
}

export function validateSettlementPaymentInput(
  input: SettlementPaymentInput,
  participants: Participant[]
): Result<SettlementPaymentInput> {
  const participantIds = new Set(participants.map((participant) => participant.id))

  if (!participantIds.has(input.senderParticipantId)) {
    return { ok: false, message: 'Sender must be an existing Participant' }
  }
  if (!participantIds.has(input.recipientParticipantId)) {
    return { ok: false, message: 'Recipient must be an existing Participant' }
  }
  if (input.senderParticipantId === input.recipientParticipantId) {
    return { ok: false, message: 'Sender and Recipient must be different Participants' }
  }
  if (input.amountMinor <= 0) {
    return { ok: false, message: 'Settlement Payment amount must be positive' }
  }

  return { ok: true, value: input }
}

export function withDerived(snapshot: Omit<EventSnapshot, 'balances' | 'suggestedSettlements'>): EventSnapshot {
  const balances = calculateBalances(snapshot.participants, snapshot.expenses, snapshot.settlementPayments)
  return {
    ...snapshot,
    balances,
    suggestedSettlements: suggestSettlements(snapshot.participants, balances)
  }
}

function sortByAmountThenOrder(
  left: { participantId: string; amountMinor: number },
  right: { participantId: string; amountMinor: number },
  orderByParticipantId: Map<string, number>
): number {
  if (left.amountMinor !== right.amountMinor) {
    return left.amountMinor - right.amountMinor
  }
  return (orderByParticipantId.get(left.participantId) ?? 0) - (orderByParticipantId.get(right.participantId) ?? 0)
}
