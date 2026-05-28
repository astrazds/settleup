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

function payerWarningMessage(payerId, includedParticipants, participants) {
  if (includedParticipants.some((participant) => participant.id === payerId)) return ''
  const payer = participants.find((participant) => participant.id === payerId) || { displayName: 'Unknown Participant' }
  return payer.displayName + ' paid but is not included.'
}
`
