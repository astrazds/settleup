import { moneyInputPatternSource } from '../money'

export interface ExpenseDraftParticipant {
  id: string
  displayName: string
  order: number
}

export interface ExpenseDraftShareInput {
  participantId: string
  amount: string
}

export interface ExpenseDraftShare {
  participantId: string
  amountMinor: number
  amount: string
}

export interface ExpenseDraftComposition {
  includedParticipants: ExpenseDraftParticipant[]
  equalShares: ExpenseDraftShare[]
  equalPayload: ExpenseDraftShareInput[]
  payerWarning: string | null
}

export interface ComposeExpenseDraftInput {
  amount: string
  payerParticipantId: string
  participants: readonly ExpenseDraftParticipant[]
  includedParticipantIds: readonly string[]
}

const draftMoneyPattern = new RegExp(`^${moneyInputPatternSource}$`)

export function parseDraftMoneyMinor(value: unknown): number | null {
  const textValue = String(value || '').trim()
  if (!draftMoneyPattern.test(textValue)) {
    return null
  }

  const [wholePart, decimalPart = ''] = textValue.split('.')
  const amountMinor = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0'))
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return null
  }

  return amountMinor
}

export function formatDraftMoneyMinor(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return ''
  }
  return String((amountMinor / 100).toFixed(2))
}

export function equalShares(
  amountMinor: number,
  participants: readonly Pick<ExpenseDraftParticipant, 'id' | 'order'>[]
): ExpenseDraftShare[] {
  if (participants.length === 0) return []
  const base = Math.floor(amountMinor / participants.length)
  let remainder = amountMinor - base * participants.length
  return participants
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((participant) => {
      const amountMinorForParticipant = base + (remainder > 0 ? 1 : 0)
      remainder -= 1
      return {
        participantId: participant.id,
        amountMinor: amountMinorForParticipant,
        amount: formatDraftMoneyMinor(amountMinorForParticipant)
      }
    })
}

export function composeExpenseDraft(input: ComposeExpenseDraftInput): ExpenseDraftComposition {
  const includedParticipants = includedParticipantsFor(input.participants, input.includedParticipantIds)
  const totalMinor = parseDraftMoneyMinor(input.amount) ?? 0
  const equalDraftShares = equalShares(totalMinor, includedParticipants)
  const payer = input.participants.find((participant) => participant.id === input.payerParticipantId)
  const payerIncluded = includedParticipants.some((participant) => participant.id === input.payerParticipantId)

  return {
    includedParticipants,
    equalShares: equalDraftShares,
    equalPayload: equalDraftShares.map((share) => ({
      participantId: share.participantId,
      amount: share.amount
    })),
    payerWarning: payer && !payerIncluded ? `${payer.displayName} paid but is not included.` : null
  }
}

function includedParticipantsFor(
  participants: readonly ExpenseDraftParticipant[],
  includedParticipantIds: readonly string[]
): ExpenseDraftParticipant[] {
  const includedIds = new Set(includedParticipantIds)
  return participants.filter((participant) => includedIds.has(participant.id))
}
