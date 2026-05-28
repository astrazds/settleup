import {
  equalExpenseShares,
  parseCurrency,
  parseMoney,
  trimRequired
} from './domain'
import type { ExpenseInput, Participant, Result, SettlementPaymentInput, SupportedCurrency } from './domain'

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

export function parseExpenseInput(raw: unknown, currency: string, participants: Participant[]): ExpenseInput {
  const description = parseRequiredText(raw, 'description', 'Expense description')
  const amount = parseRequiredMoney(raw, 'amount', currency)
  const payerParticipantId = parseRequiredText(raw, 'payerParticipantId', 'Payer')
  const includedParticipantIds = parseIncludedParticipantIds(field(raw, 'includedParticipantIds'), participants)

  return {
    description,
    amountMinor: amount,
    payerParticipantId,
    shares: equalExpenseShares(amount, participants, includedParticipantIds)
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

function parseIncludedParticipantIds(raw: unknown, participants: Participant[]): string[] {
  if (!Array.isArray(raw)) {
    throw new CommandInputError('Included Participants are required')
  }

  const participantIds = new Set(participants.map((participant) => participant.id))
  const seen = new Set<string>()
  const includedParticipantIds = raw.map((item) => {
    const participantId = trimRequired(item, 'Included Participant')
    if (!participantId.ok) {
      throw new CommandInputError(participantId.message)
    }
    if (!participantIds.has(participantId.value)) {
      throw new CommandInputError('Each Included Participant must be an existing Participant')
    }
    if (seen.has(participantId.value)) {
      throw new CommandInputError('Each Included Participant can only be selected once')
    }
    seen.add(participantId.value)
    return participantId.value
  })

  if (includedParticipantIds.length === 0) {
    throw new CommandInputError('Choose at least one Participant to split between')
  }

  return includedParticipantIds
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
