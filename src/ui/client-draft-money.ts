import { moneyInputPatternSource } from '../money'

export const clientDraftMoneyScript = String.raw`
const draftMoneyPattern = new RegExp(${JSON.stringify(`^${moneyInputPatternSource}$`)})

function parseDraftMoneyMinor(value) {
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

function formatDraftMoneyMinor(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return ''
  }
  return String((amountMinor / 100).toFixed(2))
}

function equalShares(amountMinor, participants) {
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
        amountMinor: amountMinorForParticipant
      }
    })
}

function draftShareSummary(amountText, shareAmounts) {
  const totalInput = amountText.trim()
  const parsedTotalMinor = totalInput ? parseDraftMoneyMinor(totalInput) : 0
  let hasInvalidDraftMoney = totalInput !== '' && parsedTotalMinor === null
  let assignedMinor = 0
  for (const amount of shareAmounts) {
    const shareInput = amount.trim()
    const parsedShareMinor = shareInput ? parseDraftMoneyMinor(shareInput) : 0
    hasInvalidDraftMoney = hasInvalidDraftMoney || (shareInput !== '' && parsedShareMinor === null)
    assignedMinor += parsedShareMinor || 0
  }
  const totalMinor = parsedTotalMinor || 0
  return {
    totalMinor,
    assignedMinor,
    remainingMinor: totalMinor - assignedMinor,
    hasInvalidDraftMoney
  }
}

function syncDraftSharesFromIncluded(amountText, includedParticipants, previousShares) {
  const previousAmounts = new Map(previousShares.map((share) => [share.participantId, share.amount]))
  const amountMinor = parseDraftMoneyMinor(amountText) || 0
  const fallbackAmounts = new Map(equalShares(amountMinor, includedParticipants).map((share) => [
    share.participantId,
    share.amountMinor > 0 ? formatDraftMoneyMinor(share.amountMinor) : ''
  ]))
  return includedParticipants
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((participant) => ({
      participantId: participant.id,
      amount: previousAmounts.get(participant.id) ?? fallbackAmounts.get(participant.id) ?? ''
    }))
}

function payerWarningMessage(payerId, includedParticipants, participants) {
  if (includedParticipants.some((participant) => participant.id === payerId)) return ''
  const payer = participants.find((participant) => participant.id === payerId) || { displayName: 'Unknown Participant' }
  return payer.displayName + ' paid but is not included.'
}

function assignRemainingToDraftShare(shares, participantId, remainingMinor) {
  const currentShare = shares.find((share) => share.participantId === participantId)
  if (!currentShare) return { ok: true, shares: shares.slice() }
  const currentMinor = parseDraftMoneyMinor(currentShare.amount) || 0
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
      ? { participantId: share.participantId, amount: formatDraftMoneyMinor(nextAmountMinor) }
      : share
    )
  }
}
`
