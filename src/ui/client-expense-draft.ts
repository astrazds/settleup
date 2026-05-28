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

export interface ExpenseDraftSummary {
  totalMinor: number
  assignedMinor: number
  remainingMinor: number
  hasInvalidDraftMoney: boolean
}

export interface ExpenseDraftComposition {
  includedParticipants: ExpenseDraftParticipant[]
  equalShares: ExpenseDraftShare[]
  equalPayload: ExpenseDraftShareInput[]
  exactShares: ExpenseDraftShareInput[]
  exactPayload: ExpenseDraftShareInput[]
  summary: ExpenseDraftSummary
  payerWarning: string | null
}

export interface ComposeExpenseDraftInput {
  amount: string
  payerParticipantId: string
  participants: readonly ExpenseDraftParticipant[]
  includedParticipantIds: readonly string[]
  exactShares: readonly ExpenseDraftShareInput[]
}

export type AssignRemainingResult =
  | { ok: true, shares: ExpenseDraftShareInput[] }
  | { ok: false, message: string }

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
  const exactShares = syncExactSharesFromIncluded(input.exactShares, equalDraftShares, includedParticipants)
  const payer = input.participants.find((participant) => participant.id === input.payerParticipantId)
  const payerIncluded = includedParticipants.some((participant) => participant.id === input.payerParticipantId)

  return {
    includedParticipants,
    equalShares: equalDraftShares,
    equalPayload: equalDraftShares.map((share) => ({
      participantId: share.participantId,
      amount: share.amount
    })),
    exactShares,
    exactPayload: exactShares,
    summary: summarizeDraftShares(input.amount, exactShares.map((share) => share.amount)),
    payerWarning: payer && !payerIncluded ? `${payer.displayName} paid but is not included.` : null
  }
}

export function summarizeDraftShares(amount: string, shareAmounts: readonly string[]): ExpenseDraftSummary {
  const totalInput = amount.trim()
  const parsedTotalMinor = totalInput ? parseDraftMoneyMinor(totalInput) : 0
  let hasInvalidDraftMoney = totalInput !== '' && parsedTotalMinor === null
  let assignedMinor = 0

  for (const amountText of shareAmounts) {
    const shareInput = amountText.trim()
    const parsedShareMinor = shareInput ? parseDraftMoneyMinor(shareInput) : 0
    hasInvalidDraftMoney = hasInvalidDraftMoney || (shareInput !== '' && parsedShareMinor === null)
    assignedMinor += parsedShareMinor ?? 0
  }

  const totalMinor = parsedTotalMinor ?? 0
  return {
    totalMinor,
    assignedMinor,
    remainingMinor: totalMinor - assignedMinor,
    hasInvalidDraftMoney
  }
}

export function assignRemainingToDraftShare(
  shares: readonly ExpenseDraftShareInput[],
  participantId: string,
  remainingMinor: number
): AssignRemainingResult {
  const currentShare = shares.find((share) => share.participantId === participantId)
  if (!currentShare) {
    return { ok: true, shares: shares.slice() }
  }

  const currentMinor = parseDraftMoneyMinor(currentShare.amount) ?? 0
  const nextAmountMinor = currentMinor + remainingMinor
  if (nextAmountMinor <= 0) {
    return {
      ok: false,
      message: 'Remaining amount would make that Share non-positive'
    }
  }

  return {
    ok: true,
    shares: shares.map((share) => share.participantId === participantId
      ? { ...share, amount: formatDraftMoneyMinor(nextAmountMinor) }
      : share
    )
  }
}

function includedParticipantsFor(
  participants: readonly ExpenseDraftParticipant[],
  includedParticipantIds: readonly string[]
): ExpenseDraftParticipant[] {
  const includedIds = new Set(includedParticipantIds)
  return participants.filter((participant) => includedIds.has(participant.id))
}

function syncExactSharesFromIncluded(
  previousShares: readonly ExpenseDraftShareInput[],
  fallbackShares: readonly ExpenseDraftShare[],
  includedParticipants: readonly ExpenseDraftParticipant[]
): ExpenseDraftShareInput[] {
  const previousAmounts = new Map(previousShares.map((share) => [share.participantId, share.amount]))
  const fallbackAmounts = new Map(fallbackShares.map((share) => [share.participantId, share.amount]))
  return includedParticipants
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((participant) => ({
      participantId: participant.id,
      amount: previousAmounts.get(participant.id) ?? fallbackAmounts.get(participant.id) ?? ''
    }))
}
