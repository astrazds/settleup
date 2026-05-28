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

  it('shows transient notifications without changing trigger button text', () => {
    const toast = fakeElement()
    const client = loadClientHarness({ '[data-toast-message]': toast })

    client.showToast('Event Link copied')

    expect(toast.textContent).toBe('Event Link copied')
    expect(toast.hidden).toBe(false)
    expect(clientScript).not.toContain("button.textContent = 'Event Link copied'")
    expect(clientScript).not.toContain("button.textContent = 'Summary copied'")
  })

  it('guides a one-Participant empty Event toward adding Participants', () => {
    const panel = fakeElement()
    const title = fakeElement()
    const copy = fakeElement()
    const action = fakeElement()
    const client = loadClientHarness({
      '[data-start-guidance]': panel,
      '[data-start-title]': title,
      '[data-start-copy]': copy,
      '[data-start-action]': action
    })

    client.setSnapshot({
      participants: [{ id: 'sarah', order: 1 }],
      expenses: []
    })
    client.renderStartGuidance()

    expect(panel.hidden).toBe(false)
    expect(panel.dataset.startTarget).toBe('[data-participant-form]')
    expect(title.textContent).toBe('Add the people sharing this Event')
    expect(action.textContent).toBe('Add Participant')
  })

  it('guides a multi-Participant empty Event toward the first Expense', () => {
    const panel = fakeElement()
    const title = fakeElement()
    const copy = fakeElement()
    const action = fakeElement()
    const client = loadClientHarness({
      '[data-start-guidance]': panel,
      '[data-start-title]': title,
      '[data-start-copy]': copy,
      '[data-start-action]': action
    })

    client.setSnapshot({
      participants: [
        { id: 'sarah', order: 1 },
        { id: 'alex', order: 2 }
      ],
      expenses: []
    })
    client.renderStartGuidance()

    expect(panel.hidden).toBe(false)
    expect(panel.dataset.startTarget).toBe('[data-expense-form]')
    expect(title.textContent).toBe('Record the first shared cost')
    expect(action.textContent).toBe('Add Expense')
  })

  it('normalizes panel action visibility for empty, populated, focused, and settled Events', () => {
    const client = loadClientHarness()
    const empty = snapshot({
      participants: [participant('sarah', 'Sarah', 1)]
    })
    const populated = snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)],
      expenses: [{
        id: 'expense-1',
        description: 'Dinner',
        amountMinor: 8000,
        payerParticipantId: 'sarah',
        shares: [
          { participantId: 'sarah', amountMinor: 4000 },
          { participantId: 'alex', amountMinor: 4000 }
        ]
      }],
      suggestedSettlements: [{ senderParticipantId: 'alex', recipientParticipantId: 'sarah', amountMinor: 4000 }]
    })
    const settled = snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)],
      expenses: [{
        id: 'expense-1',
        description: 'Dinner',
        amountMinor: 8000,
        payerParticipantId: 'sarah',
        shares: [
          { participantId: 'sarah', amountMinor: 4000 },
          { participantId: 'alex', amountMinor: 4000 }
        ]
      }],
      settlementPayments: [{
        id: 'payment-1',
        senderParticipantId: 'alex',
        recipientParticipantId: 'sarah',
        amountMinor: 4000
      }]
    })

    expect(client.panelActionState(empty, false)).toMatchObject({
      suggestedSettlements: {
        showSettlementFocus: false,
        showCopySummary: false,
        showSuggestionCount: false,
        recordButtonClass: 'secondary'
      },
      settlementPaymentForm: {
        canRecord: false,
        disabledReason: 'Add another Participant before recording a Settlement Payment.'
      },
      participants: {
        deleteById: {
          sarah: {
            canDelete: false,
            reason: 'Keep at least one Participant in the Event.'
          }
        }
      }
    })
    expect(client.panelActionState(populated, false)).toMatchObject({
      suggestedSettlements: {
        showSettlementFocus: true,
        showCopySummary: false,
        settlementFocusButtonClass: '',
        recordButtonClass: 'secondary'
      },
      settlementPaymentForm: {
        canRecord: true,
        disabledReason: ''
      },
      participants: {
        deleteById: {
          sarah: { canDelete: false, reason: 'Referenced Participants cannot be deleted.' },
          alex: { canDelete: false, reason: 'Referenced Participants cannot be deleted.' }
        }
      }
    })
    expect(client.panelActionState(populated, true)).toMatchObject({
      suggestedSettlements: {
        showCopySummary: true,
        settlementFocusButtonClass: 'secondary',
        recordButtonClass: ''
      }
    })
    expect(client.panelActionState(settled, true)).toMatchObject({
      suggestedSettlements: {
        showSettlementFocus: false,
        showCopySummary: false,
        showSuggestionCount: false
      }
    })
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
  showToast: (message: string) => void
  renderStartGuidance: () => void
  panelActionState: (value: unknown, settlementFocus: boolean) => unknown
  shouldShowDraftUpdateWarning: (preserveDrafts: boolean, previousEventUpdatedAt: string | null) => boolean
}

interface FakeElement {
  dataset: Record<string, string>
  hidden: boolean
  textContent: string
  querySelector: (selector: string) => FakeElement | null
}

function loadClientHarness(elements: Record<string, FakeElement> = {}): ClientHarness {
  const factory = new Function('document', 'localStorage', 'window', 'navigator', 'fetch', 'WebSocket', `${clientScript}
return {
  equalShares,
  setExpenseDraftDirty(value) { expenseDraftDirty = value },
  setSettlementDraftDirty(value) { settlementDraftDirty = value },
  setSnapshot(value) { snapshot = value },
  showToast,
  renderStartGuidance,
  panelActionState,
  shouldShowDraftUpdateWarning
}
`)
  const elementMap = new Map(Object.entries(elements))
  const app = fakeElement()
  app.querySelector = (selector) => elementMap.get(selector) ?? null

  return factory(
    { querySelector: (selector: string) => selector === '#app' ? app : null },
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

function fakeElement(): FakeElement {
  return {
    dataset: {},
    hidden: true,
    textContent: '',
    querySelector: () => null
  }
}

function participant(id: string, displayName: string, order: number) {
  return { id, displayName, order }
}

function snapshot(overrides: {
  participants: Array<{ id: string, displayName: string, order: number }>
  expenses?: Array<{
    id: string
    description: string
    amountMinor: number
    payerParticipantId: string
    shares: Array<{ participantId: string, amountMinor: number }>
  }>
  settlementPayments?: Array<{
    id: string
    senderParticipantId: string
    recipientParticipantId: string
    amountMinor: number
  }>
  suggestedSettlements?: Array<{
    senderParticipantId: string
    recipientParticipantId: string
    amountMinor: number
  }>
}) {
  return {
    event: {
      id: 'event-1',
      token: 'token',
      title: 'Sydney weekend',
      currency: 'AUD',
      eventLinkPath: '/e/token',
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z'
    },
    participants: overrides.participants,
    expenses: overrides.expenses || [],
    settlementPayments: overrides.settlementPayments || [],
    balances: [],
    suggestedSettlements: overrides.suggestedSettlements || []
  }
}
