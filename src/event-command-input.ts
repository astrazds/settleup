import {
  parseCurrency,
  parseMoney,
  trimRequired
} from './domain'
import type { ExpenseInput, Result, SettlementPaymentInput, Share, SupportedCurrency } from './domain'

export class CommandInputError extends Error {
  constructor(public readonly message: string) {
    super(message)
  }
}

export function parseCreateEventInput(raw: unknown): Result<{
  title: string
  currency: SupportedCurrency
  displayName: string
}> {
  const title = trimRequired(field(raw, 'title'), 'Event Title')
  if (!title.ok) {
    return title
  }
  const currency = parseCurrency(field(raw, 'currency'))
  if (!currency.ok) {
    return currency
  }
  const displayName = trimRequired(field(raw, 'displayName'), 'Participant display name')
  if (!displayName.ok) {
    return displayName
  }
  return createResult({ title: title.value, currency: currency.value, displayName: displayName.value })
}

export function parseParticipantDisplayName(raw: unknown): string {
  return parseRequiredText(raw, 'displayName', 'Participant display name')
}

export function parseExpenseInput(raw: unknown, currency: string): ExpenseInput {
  const description = parseRequiredText(raw, 'description', 'Expense description')
  const amount = parseRequiredMoney(raw, 'amount', currency)
  const payerParticipantId = parseRequiredText(raw, 'payerParticipantId', 'Payer')

  return {
    description,
    amountMinor: amount,
    payerParticipantId,
    shares: parseShares(field(raw, 'shares'), currency)
  }
}

export function parseSettlementPaymentInput(raw: unknown, currency: string): SettlementPaymentInput {
  const senderParticipantId = parseRequiredText(raw, 'senderParticipantId', 'Sender')
  const recipientParticipantId = parseRequiredText(raw, 'recipientParticipantId', 'Recipient')
  const amountMinor = parseRequiredMoney(raw, 'amount', currency)

  return {
    senderParticipantId,
    recipientParticipantId,
    amountMinor
  }
}

function parseShares(raw: unknown, currency: string): Share[] {
  if (!Array.isArray(raw)) {
    throw new CommandInputError('Shares are required')
  }

  return raw.map((item) => {
    const participantId = parseRequiredText(item, 'participantId', 'Share Participant')
    const amountMinor = parseRequiredMoney(item, 'amount', currency)
    return {
      participantId,
      amountMinor
    }
  })
}

function parseRequiredText(raw: unknown, key: string, label: string): string {
  const value = trimRequired(field(raw, key), label)
  if (!value.ok) {
    throw new CommandInputError(value.message)
  }
  return value.value
}

function parseRequiredMoney(raw: unknown, key: string, currency: string): number {
  const value = parseMoney(field(raw, key), currency)
  if (!value.ok) {
    throw new CommandInputError(value.message)
  }
  return value.value
}

function field(raw: unknown, key: string): unknown {
  if (raw && typeof raw === 'object' && key in raw) {
    return (raw as Record<string, unknown>)[key]
  }
  return undefined
}

function createResult<T>(value: T): { ok: true; value: T } {
  return { ok: true, value }
}
