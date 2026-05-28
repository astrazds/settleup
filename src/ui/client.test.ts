import { describe, expect, it } from 'vitest'

import { clientScript } from './client'

describe('client script contract', () => {
  it('emits parseable browser JavaScript', () => {
    expect(() => new Function(clientScript)).not.toThrow()
  })

  it('splits equal Shares by Participant order and assigns rounding deterministically', () => {
    const client = loadClientHarness()

    const shares = client.equalShares(1000, [
      { id: 'participant-3', order: 3 },
      { id: 'participant-1', order: 1 },
      { id: 'participant-2', order: 2 }
    ])

    expect(shares).toEqual([
      { participantId: 'participant-1', amountMinor: 334 },
      { participantId: 'participant-2', amountMinor: 333 },
      { participantId: 'participant-3', amountMinor: 333 }
    ])
  })

  it('does not warn dirty drafts during unchanged fallback polling refreshes', () => {
    const client = loadClientHarness()
    client.setSnapshot({ event: { updatedAt: '2026-05-28T00:00:00.000Z' } })
    client.setExpenseDraftDirty(true)

    expect(client.shouldShowDraftUpdateWarning(true, '2026-05-28T00:00:00.000Z')).toBe(false)
  })

  it('warns dirty drafts when a preserved refresh sees a changed Event timestamp', () => {
    const client = loadClientHarness()
    client.setSnapshot({ event: { updatedAt: '2026-05-28T00:00:01.000Z' } })
    client.setSettlementDraftDirty(true)

    expect(client.shouldShowDraftUpdateWarning(true, '2026-05-28T00:00:00.000Z')).toBe(true)
    expect(client.shouldShowDraftUpdateWarning(false, '2026-05-28T00:00:00.000Z')).toBe(false)
  })
})

interface ClientHarness {
  equalShares: (
    amountMinor: number,
    participants: Array<{ id: string, order: number }>
  ) => Array<{ participantId: string, amountMinor: number }>
  setExpenseDraftDirty: (value: boolean) => void
  setSettlementDraftDirty: (value: boolean) => void
  setSnapshot: (value: unknown) => void
  shouldShowDraftUpdateWarning: (preserveDrafts: boolean, previousEventUpdatedAt: string | null) => boolean
}

function loadClientHarness(): ClientHarness {
  const factory = new Function('document', 'localStorage', 'window', 'navigator', 'fetch', 'WebSocket', `${clientScript}
return {
  equalShares,
  setExpenseDraftDirty(value) { expenseDraftDirty = value },
  setSettlementDraftDirty(value) { settlementDraftDirty = value },
  setSnapshot(value) { snapshot = value },
  shouldShowDraftUpdateWarning
}
`)

  return factory(
    { querySelector: () => null },
    { getItem: () => null, setItem: () => undefined },
    {
      addEventListener: () => undefined,
      clearInterval: () => undefined,
      clearTimeout: () => undefined,
      location: { protocol: 'https:', host: 'example.test' },
      setInterval: () => 1,
      setTimeout: () => 1
    },
    { clipboard: { writeText: async () => undefined } },
    async () => new Response(null, { status: 404 }),
    class {}
  ) as ClientHarness
}
