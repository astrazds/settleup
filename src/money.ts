import type { Result } from './domain'

export const moneyInputPatternSource = String.raw`\d+(?:\.\d{1,2})?`

export function parseMoney(value: unknown, currency: string): Result<number> {
  void currency

  if (typeof value !== 'string' && typeof value !== 'number') {
    return { ok: false, message: 'Amount is required' }
  }

  const text = String(value).trim()
  if (!new RegExp(`^${moneyInputPatternSource}$`).test(text)) {
    return { ok: false, message: 'Amount must be a positive decimal amount' }
  }

  const [wholePart, decimalPart = ''] = text.split('.')
  const amountMinor = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0'))
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return { ok: false, message: 'Amount must be positive' }
  }

  return { ok: true, value: amountMinor }
}

export function formatMoney(amountMinor: number, currency: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amountMinor / 100)
}
