import { describe, expect, it } from 'vitest'

import {
  EVENT_REALTIME_FALLBACK_POLL_MS,
  eventRealtimeReconnectDelay,
  eventRealtimeRoutePath,
  parseEventRealtimeMessage
} from '../event-realtime-protocol'
import { parseMoney } from '../money'
import { clientScript } from './client'
import {
  composeExpenseDraft,
  formatDraftMoneyMinor,
  parseDraftMoneyMinor
} from './client-expense-draft'
import { composeEventPagePolicy } from './client-event-page-policy'

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

  it('composes equal Expense Draft Shares without relying on browser DOM state', () => {
    const participants = [
      participant('participant-3', 'Priya', 3),
      participant('participant-1', 'Sarah', 1),
      participant('participant-2', 'Alex', 2)
    ]

    const equalDraft = composeExpenseDraft({
      amount: '10.00',
      payerParticipantId: 'participant-3',
      participants,
      includedParticipantIds: ['participant-3', 'participant-1', 'participant-2']
    })

    expect(equalDraft.equalShares).toEqual([
      { participantId: 'participant-1', amountMinor: 334, amount: '3.34' },
      { participantId: 'participant-2', amountMinor: 333, amount: '3.33' },
      { participantId: 'participant-3', amountMinor: 333, amount: '3.33' }
    ])
    expect(equalDraft.equalPayload).toEqual([
      { participantId: 'participant-1', amount: '3.34' },
      { participantId: 'participant-2', amount: '3.33' },
      { participantId: 'participant-3', amount: '3.33' }
    ])

    const excludedPayerDraft = composeExpenseDraft({
      amount: '10.00',
      payerParticipantId: 'participant-3',
      participants,
      includedParticipantIds: ['participant-1', 'participant-2']
    })

    expect(excludedPayerDraft.equalPayload).toEqual([
      { participantId: 'participant-1', amount: '5.00' },
      { participantId: 'participant-2', amount: '5.00' }
    ])
    expect(excludedPayerDraft.payerWarning).toBe('Priya paid but is not included.')

    const savedMoney = parseMoney('12.30', 'AUD')
    expect(savedMoney).toEqual({ ok: true, value: 1230 })
    expect(parseDraftMoneyMinor('12.30')).toBe(savedMoney.ok ? savedMoney.value : null)
    expect(parseDraftMoneyMinor('1.234')).toBeNull()
    expect(formatDraftMoneyMinor(1230)).toBe('12.30')
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

  it('keeps utility actions and histories in the task-region policy', () => {
    const policy = composeEventPagePolicy(snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)]
    }))

    expect(policy.taskRegions).toEqual({
      balances: {
        visible: true
      },
      addExpense: {
        visible: true,
        participantPlacement: 'addExpense'
      },
      recordSettlementPayment: {
        visible: true
      },
      eventHistory: {
        visible: true,
        order: 'newest-first',
        itemCount: 0
      }
    })
    expect(policy.eventLink).toEqual({
      showCopy: true,
      placement: 'expenseDefaults',
      showPanel: false
    })
    expect(policy.layout).toMatchObject({
      showParticipantsPanel: false,
      showEventLinkPanel: false,
      showHistoryPanel: true
    })
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

  it('composes Event page UI policy without rendering HTML', () => {
    const oneParticipantEmpty = composeEventPagePolicy(snapshot({
      participants: [participant('sarah', 'Sarah', 1)]
    }))
    expect(oneParticipantEmpty.startGuidance).toEqual({
      visible: true,
      target: '[data-participant-form]',
      title: 'Add the people sharing this Event',
      copy: 'Start with Participants, then record the first shared cost.',
      action: 'Add Participant'
    })
    expect(oneParticipantEmpty.currentParticipantDefaults).toEqual({
      visible: true,
      label: 'Expense defaults',
      selectorLabel: 'Expense defaults Participant',
      switchLabel: 'Switch',
      impliesLoginOrPermissions: false
    })
    expect(oneParticipantEmpty.participants.deleteById).toMatchObject({
      sarah: {
        canDelete: false,
        reason: 'Keep at least one Participant in the Event.'
      }
    })

    const populatedPolicy = composeEventPagePolicy(snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)],
      expenses: [
        {
          id: 'expense-b',
          description: 'Late dinner',
          amountMinor: 8000,
          payerParticipantId: 'sarah',
          shares: [{ participantId: 'sarah', amountMinor: 4000 }, { participantId: 'alex', amountMinor: 4000 }],
          createdAt: '2026-05-28T10:00:00.000Z'
        },
        {
          id: 'expense-a',
          description: 'Earlier dinner',
          amountMinor: 2400,
          payerParticipantId: 'alex',
          shares: [{ participantId: 'sarah', amountMinor: 1200 }, { participantId: 'alex', amountMinor: 1200 }],
          createdAt: '2026-05-28T10:00:00.000Z'
        }
      ],
      settlementPayments: [{
        id: 'payment-a',
        senderParticipantId: 'alex',
        recipientParticipantId: 'sarah',
        amountMinor: 2000,
        createdAt: '2026-05-28T10:00:00.000Z'
      }],
      suggestedSettlements: [{ senderParticipantId: 'alex', recipientParticipantId: 'sarah', amountMinor: 4000 }]
    }))

    expect(populatedPolicy.startGuidance).toEqual({
      visible: false,
      target: '',
      title: '',
      copy: '',
      action: ''
    })
    expect(populatedPolicy.participants.deleteById).toMatchObject({
      sarah: { canDelete: false, reason: 'Referenced Participants cannot be deleted.' },
      alex: { canDelete: false, reason: 'Referenced Participants cannot be deleted.' }
    })
    expect(populatedPolicy.eventHistory.items.map((item) => `${item.kind}:${item.record.id}`)).toEqual([
      'expense:expense-a',
      'expense:expense-b',
      'settlementPayment:payment-a'
    ])

    const multiParticipantEmpty = composeEventPagePolicy(snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)]
    }))
    expect(multiParticipantEmpty.startGuidance).toMatchObject({
      visible: true,
      target: '[data-expense-form]',
      title: 'Record the first shared cost',
      action: 'Add Expense'
    })
  })

  it('normalizes panel action visibility for empty, populated, and settled Events', () => {
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

    expect(client.panelActionState(empty)).toMatchObject({
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
    expect(client.panelActionState(populated)).toMatchObject({
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
    expect(client.panelActionState(settled)).toMatchObject({
      settlementPaymentForm: {
        canRecord: true,
        disabledReason: ''
      }
    })
  })

  it('documents the compressed Event-page layout state', () => {
    const state = composeEventPagePolicy(snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)]
    }))

    expect(state).toMatchObject({
      eventLink: {
        showCopy: true,
        placement: 'expenseDefaults',
        showPanel: false
      },
      layout: {
        participantPlacement: 'addExpense',
        showParticipantsPanel: false,
        eventLinkPlacement: 'expenseDefaults',
        showEventLinkPanel: false,
        showHistoryPanel: true,
        historyOrder: 'newest-first'
      }
    })
  })

  it('orders mixed Event History records newest first', () => {
    const client = loadClientHarness()
    const event = snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)],
      expenses: [
        {
          id: 'expense-1',
          description: 'Dinner',
          amountMinor: 8000,
          payerParticipantId: 'sarah',
          shares: [{ participantId: 'sarah', amountMinor: 4000 }, { participantId: 'alex', amountMinor: 4000 }],
          createdAt: '2026-05-28T08:00:00.000Z'
        },
        {
          id: 'expense-2',
          description: 'Ferry',
          amountMinor: 2400,
          payerParticipantId: 'alex',
          shares: [{ participantId: 'sarah', amountMinor: 1200 }, { participantId: 'alex', amountMinor: 1200 }],
          createdAt: '2026-05-28T09:00:00.000Z'
        }
      ],
      settlementPayments: [{
        id: 'payment-1',
        senderParticipantId: 'alex',
        recipientParticipantId: 'sarah',
        amountMinor: 2000,
        createdAt: '2026-05-28T10:00:00.000Z'
      }]
    })

    expect(client.historyItems(event).map((item) => `${item.kind}:${item.record.id}`)).toEqual([
      'settlementPayment:payment-1',
      'expense:expense-2',
      'expense:expense-1'
    ])
  })

  it('detects the new Participant so embedded add can include it in the active Expense draft', () => {
    const client = loadClientHarness()
    const before = snapshot({
      participants: [participant('sarah', 'Sarah', 1)]
    })
    const after = snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)]
    })

    expect(client.newParticipantId(before, after)).toBe('alex')
    expect(client.newParticipantId(after, after)).toBeNull()
  })

  it('uses the shared Event realtime protocol shape in the browser bootstrap', () => {
    const client = loadClientHarness({}, 'event-token-a')

    expect(client.parseEventRealtimeMessage('{"type":"event_changed"}')).toEqual(
      parseEventRealtimeMessage('{"type":"event_changed"}')
    )
    expect(client.parseEventRealtimeMessage('pong')).toBeNull()
    expect(client.parseEventRealtimeMessage('{')).toBeNull()
    expect(client.parseEventRealtimeMessage('{"type":"presence_changed"}')).toBeNull()
    expect(client.realtimeUrl()).toBe(`wss://example.test${eventRealtimeRoutePath('event-token-a')}`)
    expect(client.eventRealtimeReconnectDelay(1)).toBe(eventRealtimeReconnectDelay(1))
    expect(client.eventRealtimeReconnectDelay(6)).toBe(eventRealtimeReconnectDelay(6))
  })

  it('schedules one deterministic fallback polling interval', () => {
    const timers: ClientHarnessTimers = { intervals: [] }
    const client = loadClientHarness({}, undefined, timers)

    client.startFallbackPolling()
    client.startFallbackPolling()

    expect(timers.intervals.map((interval) => interval.delay)).toEqual([EVENT_REALTIME_FALLBACK_POLL_MS])
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
  panelActionState: (value: unknown) => unknown
  historyItems: (value: unknown) => Array<{ kind: string, record: { id: string } }>
  newParticipantId: (previousSnapshot: unknown, nextSnapshot: unknown) => string | null
  shouldShowDraftUpdateWarning: (preserveDrafts: boolean, previousEventUpdatedAt: string | null) => boolean
  parseEventRealtimeMessage: (data: unknown) => unknown
  realtimeUrl: () => string
  eventRealtimeReconnectDelay: (attempt: number) => number
  startFallbackPolling: () => void
}

interface ClientHarnessTimers {
  intervals: Array<{ callback: () => void, delay: number }>
}

interface FakeElement {
  dataset: Record<string, string>
  hidden: boolean
  textContent: string
  querySelector: (selector: string) => FakeElement | null
}

function loadClientHarness(
  elements: Record<string, FakeElement> = {},
  tokenValue?: string,
  timers?: ClientHarnessTimers
): ClientHarness {
  const factory = new Function('document', 'localStorage', 'window', 'navigator', 'fetch', 'WebSocket', `${clientScript}
return {
  equalShares,
  setExpenseDraftDirty(value) { expenseDraftDirty = value },
  setSettlementDraftDirty(value) { settlementDraftDirty = value },
  setSnapshot(value) { snapshot = value },
  showToast,
  renderStartGuidance,
  panelActionState,
  historyItems,
  newParticipantId,
  shouldShowDraftUpdateWarning,
  parseEventRealtimeMessage,
  realtimeUrl,
  eventRealtimeReconnectDelay,
  startFallbackPolling
}
`)
  const elementMap = new Map(Object.entries(elements))
  const app = fakeElement()
  if (tokenValue) {
    app.dataset.token = tokenValue
  }
  app.querySelector = (selector) => elementMap.get(selector) ?? null

  return factory(
    { querySelector: (selector: string) => selector === '#app' ? app : null },
    { getItem: () => null, setItem: () => undefined },
    {
      addEventListener: () => undefined,
      clearInterval: () => undefined,
      clearTimeout: () => undefined,
      location: { protocol: 'https:', host: 'example.test' },
      setInterval: (callback: () => void, delay?: number) => {
        timers?.intervals.push({ callback, delay: delay ?? 0 })
        return timers ? timers.intervals.length : 1
      },
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
    createdAt?: string
  }>
  settlementPayments?: Array<{
    id: string
    senderParticipantId: string
    recipientParticipantId: string
    amountMinor: number
    createdAt?: string
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
