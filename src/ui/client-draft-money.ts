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
`
