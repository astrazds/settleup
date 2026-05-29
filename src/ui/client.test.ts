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
  equalShares,
  formatDraftMoneyMinor,
  parseDraftMoneyMinor
} from './client-expense-draft'
import { composeEventPagePolicy, eventHistoryItems } from './client-event-page-policy'
import { newParticipantId, shouldShowDraftUpdateWarning } from './client-state'

describe('client script contract', () => {
  it('emits parseable browser JavaScript', () => {
    expect(() => new Function(clientScript)).not.toThrow()
  })

  it('emits the bundled React client entrypoint', () => {
    expect(clientScript).toContain('createRoot')
    expect(clientScript).toContain('data-expense-form')
    expect(clientScript).toContain('Event Link copied')
  })

  it('splits equal Shares by Participant order and assigns rounding deterministically', () => {
    const shares = equalShares(1000, [
      { id: 'participant-3', order: 3 },
      { id: 'participant-1', order: 1 },
      { id: 'participant-2', order: 2 }
    ])

    expect(shares).toEqual([
      { participantId: 'participant-1', amountMinor: 334, amount: '3.34' },
      { participantId: 'participant-2', amountMinor: 333, amount: '3.33' },
      { participantId: 'participant-3', amountMinor: 333, amount: '3.33' }
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
    expect(shouldShowDraftUpdateWarning({
      preserveDrafts: true,
      previousEventUpdatedAt: '2026-05-28T00:00:00.000Z',
      nextEventUpdatedAt: '2026-05-28T00:00:00.000Z',
      hasActiveDraft: true
    })).toBe(false)
  })

  it('warns dirty drafts when a preserved refresh sees a changed Event timestamp', () => {
    expect(shouldShowDraftUpdateWarning({
      preserveDrafts: true,
      previousEventUpdatedAt: '2026-05-28T00:00:00.000Z',
      nextEventUpdatedAt: '2026-05-28T00:00:01.000Z',
      hasActiveDraft: true
    })).toBe(true)
    expect(shouldShowDraftUpdateWarning({
      preserveDrafts: false,
      previousEventUpdatedAt: '2026-05-28T00:00:00.000Z',
      nextEventUpdatedAt: '2026-05-28T00:00:01.000Z',
      hasActiveDraft: true
    })).toBe(false)
  })

  it('shows transient notifications without changing trigger button text', () => {
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
      placement: 'eventHeader',
      showPanel: false
    })
    expect(policy.layout).toMatchObject({
      showParticipantsPanel: false,
      showEventLinkPanel: false,
      showHistoryPanel: true
    })
  })

  it('guides a one-Participant empty Event toward adding Participants', () => {
    const policy = composeEventPagePolicy({
      participants: [participant('sarah', 'Sarah', 1)],
      settlementPayments: [],
      expenses: []
    })

    expect(policy.startGuidance).toMatchObject({
      visible: false,
      target: '',
      title: '',
      action: '',
      actionLabel: ''
    })
    expect(policy.currentParticipantDefaults.visible).toBe(false)
    expect(policy.expenseForm).toEqual({
      canRecord: false,
      disabledReason: 'Add another Participant before recording an expense.',
      onboardingTitle: 'Add another Participant first',
      onboardingCopy: 'Expenses need at least two Participants so SettleUp can split the cost.'
    })
  })

  it('guides a multi-Participant empty Event toward the first Expense', () => {
    const policy = composeEventPagePolicy({
      participants: [
        participant('sarah', 'Sarah', 1),
        participant('alex', 'Alex', 2)
      ],
      settlementPayments: [],
      expenses: []
    })

    expect(policy.startGuidance).toMatchObject({
      visible: true,
      target: '[data-expense-form]',
      title: 'Record the first shared cost',
      action: 'Add Expense',
      actionLabel: 'Focus Add Expense form'
    })
    expect(policy.currentParticipantDefaults.visible).toBe(true)
    expect(policy.expenseForm).toEqual({
      canRecord: true,
      disabledReason: '',
      onboardingTitle: '',
      onboardingCopy: ''
    })
  })

  it('composes Event page UI policy without rendering HTML', () => {
    const oneParticipantEmpty = composeEventPagePolicy(snapshot({
      participants: [participant('sarah', 'Sarah', 1)]
    }))
    expect(oneParticipantEmpty.startGuidance).toEqual({
      visible: false,
      target: '',
      title: '',
      copy: '',
      action: '',
      actionLabel: ''
    })
    expect(oneParticipantEmpty.currentParticipantDefaults).toEqual({
      visible: false,
      label: 'Adding as',
      selectorLabel: 'Choose who is adding expenses',
      switchLabel: 'Switch person',
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
      action: '',
      actionLabel: ''
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
      action: 'Add Expense',
      actionLabel: 'Focus Add Expense form'
    })
  })

  it('normalizes panel action visibility for empty, populated, and settled Events', () => {
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

    expect(composeEventPagePolicy(empty)).toMatchObject({
      settlementPaymentForm: {
        canRecord: false,
        disabledReason: 'Add another Participant before recording a payment.'
      },
      taskRegions: {
        recordSettlementPayment: {
          visible: false
        }
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
    expect(composeEventPagePolicy(populated)).toMatchObject({
      settlementPaymentForm: {
        canRecord: true,
        disabledReason: ''
      },
      taskRegions: {
        recordSettlementPayment: {
          visible: true
        }
      },
      participants: {
        deleteById: {
          sarah: { canDelete: false, reason: 'Referenced Participants cannot be deleted.' },
          alex: { canDelete: false, reason: 'Referenced Participants cannot be deleted.' }
        }
      }
    })
    expect(composeEventPagePolicy(settled)).toMatchObject({
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
        placement: 'eventHeader',
        showPanel: false
      },
      layout: {
        participantPlacement: 'addExpense',
        showParticipantsPanel: false,
        eventLinkPlacement: 'eventHeader',
        showEventLinkPanel: false,
        showHistoryPanel: true,
        historyOrder: 'newest-first'
      }
    })
  })

  it('orders mixed Event History records newest first', () => {
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

    expect(eventHistoryItems(event).map((item) => `${item.kind}:${item.record.id}`)).toEqual([
      'settlementPayment:payment-1',
      'expense:expense-2',
      'expense:expense-1'
    ])
  })

  it('detects the new Participant so embedded add can include it in the active Expense draft', () => {
    const before = snapshot({
      participants: [participant('sarah', 'Sarah', 1)]
    })
    const after = snapshot({
      participants: [participant('sarah', 'Sarah', 1), participant('alex', 'Alex', 2)]
    })

    expect(newParticipantId(before, after)).toBe('alex')
    expect(newParticipantId(after, after)).toBeNull()
  })

  it('uses the shared Event realtime protocol shape in the browser bundle', () => {
    expect(parseEventRealtimeMessage('{"type":"event_changed"}')).toEqual({ type: 'event_changed' })
    expect(parseEventRealtimeMessage('pong')).toBeNull()
    expect(parseEventRealtimeMessage('{')).toBeNull()
    expect(parseEventRealtimeMessage('{"type":"presence_changed"}')).toBeNull()
    expect(eventRealtimeRoutePath('event-token-a')).toBe('/api/events/event-token-a/realtime')
    expect(eventRealtimeReconnectDelay(1)).toBe(1000)
    expect(eventRealtimeReconnectDelay(6)).toBe(30000)
  })

  it('keeps the browser fallback polling interval deterministic', () => {
    expect(EVENT_REALTIME_FALLBACK_POLL_MS).toBe(8000)
  })
})

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
