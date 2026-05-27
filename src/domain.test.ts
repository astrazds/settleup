import { describe, expect, it } from 'vitest'
import { calculateBalances, createEventToken, parseCurrency, parseMoney, supportedCurrencies } from './domain'
import type { Expense, Participant, SettlementPayment } from './domain'

describe('money parsing', () => {
  it('accepts only the MVP supported currency codes', () => {
    expect(supportedCurrencies).toEqual(['AUD', 'USD', 'EUR', 'GBP', 'NZD'])

    for (const currency of supportedCurrencies) {
      expect(parseCurrency(currency)).toEqual({ ok: true, value: currency })
      expect(parseMoney('12.30', currency)).toEqual({ ok: true, value: 1230 })
    }
  })

  it('rejects unsupported three-letter currency codes', () => {
    expect(parseCurrency('CAD')).toEqual({
      ok: false,
      message: 'Currency must be AUD, USD, EUR, GBP, or NZD'
    })
  })

  it('accepts explicit decimal amounts as whole minor units', () => {
    expect(parseMoney('12', 'AUD')).toEqual({ ok: true, value: 1200 })
    expect(parseMoney('12.30', 'AUD')).toEqual({ ok: true, value: 1230 })
  })

  it('rejects zero, negative, arithmetic, and fractional-cent amounts', () => {
    expect(parseMoney('0', 'AUD').ok).toBe(false)
    expect(parseMoney('-2', 'AUD').ok).toBe(false)
    expect(parseMoney('10/3', 'AUD').ok).toBe(false)
    expect(parseMoney('1.234', 'AUD').ok).toBe(false)
  })
})

describe('Event Link token generation', () => {
  it('uses lowercase URL-safe characters without visually ambiguous glyphs', () => {
    const token = createEventToken(() => 0)

    expect(token).toMatch(/^[a-z2-9]+$/)
    expect(token).not.toMatch(/[01ilo]/)
  })
})

describe('Balance calculation', () => {
  const participants: Participant[] = [
    { id: 'p1', displayName: 'Sarah', createdAt: '2026-05-27T00:00:00.000Z', order: 1 },
    { id: 'p2', displayName: 'Alex', createdAt: '2026-05-27T00:00:01.000Z', order: 2 },
    { id: 'p3', displayName: 'Priya', createdAt: '2026-05-27T00:00:02.000Z', order: 3 }
  ]

  it('derives Balances from saved Expenses and Settlement Payments', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Dinner',
        amountMinor: 9000,
        payerParticipantId: 'p1',
        shares: [
          { participantId: 'p1', amountMinor: 3000 },
          { participantId: 'p2', amountMinor: 2500 },
          { participantId: 'p3', amountMinor: 3500 }
        ],
        createdAt: '2026-05-27T00:00:03.000Z',
        updatedAt: '2026-05-27T00:00:03.000Z'
      }
    ]
    const settlementPayments: SettlementPayment[] = [
      {
        id: 's1',
        senderParticipantId: 'p2',
        recipientParticipantId: 'p1',
        amountMinor: 1000,
        createdAt: '2026-05-27T00:00:04.000Z',
        updatedAt: '2026-05-27T00:00:04.000Z'
      }
    ]

    expect(calculateBalances(participants, expenses, settlementPayments)).toEqual([
      { participantId: 'p1', amountMinor: 5000 },
      { participantId: 'p2', amountMinor: -1500 },
      { participantId: 'p3', amountMinor: -3500 }
    ])
  })
})
