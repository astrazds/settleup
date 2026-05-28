export interface EventPageParticipant {
  id: string
}

export interface EventPageShare {
  participantId: string
}

export interface EventPageExpense {
  id: string
  payerParticipantId: string
  shares: readonly EventPageShare[]
  createdAt?: string
  updatedAt?: string
}

export interface EventPageSettlementPayment {
  id: string
  senderParticipantId: string
  recipientParticipantId: string
  createdAt?: string
  updatedAt?: string
}

export interface EventPageSuggestedSettlement {
  senderParticipantId: string
  recipientParticipantId: string
  amountMinor: number
}

export interface EventPageSnapshot {
  participants: readonly EventPageParticipant[]
  expenses: readonly EventPageExpense[]
  settlementPayments: readonly EventPageSettlementPayment[]
  suggestedSettlements: readonly EventPageSuggestedSettlement[]
}

export interface EventPageStartGuidance {
  visible: boolean
  target: string
  title: string
  copy: string
  action: string
}

export interface EventPageParticipantDeleteState {
  canDelete: boolean
  reason: string
}

export interface EventHistoryExpenseItem {
  kind: 'expense'
  record: EventPageExpense
  occurredAt: string
}

export interface EventHistorySettlementPaymentItem {
  kind: 'settlementPayment'
  record: EventPageSettlementPayment
  occurredAt: string
}

export type EventHistoryItem = EventHistoryExpenseItem | EventHistorySettlementPaymentItem

export interface EventPagePolicy {
  startGuidance: EventPageStartGuidance
  suggestedSettlements: {
    inFocus: boolean
    showSettlementFocus: boolean
    showCopySummary: boolean
    showSuggestionCount: boolean
    settlementFocusLabel: string
    settlementFocusButtonClass: string
    recordButtonClass: string
  }
  settlementPaymentForm: {
    canRecord: boolean
    disabledReason: string
  }
  participants: {
    deleteById: Record<string, EventPageParticipantDeleteState>
  }
  currentParticipantDefaults: {
    visible: boolean
    label: string
    selectorLabel: string
    switchLabel: string
    impliesLoginOrPermissions: boolean
  }
  eventLink: {
    showCopy: boolean
    placement: string
    showPanel: boolean
  }
  taskRegions: {
    balances: {
      visible: boolean
    }
    addExpense: {
      visible: boolean
      participantPlacement: string
    }
    recordSettlementPayment: {
      visible: boolean
      suggestedSettlementPlacement: string
    }
    eventHistory: {
      visible: boolean
      order: string
      itemCount: number
    }
  }
  eventHistory: {
    visible: boolean
    order: string
    items: EventHistoryItem[]
  }
  layout: {
    participantPlacement: string
    showParticipantsPanel: boolean
    eventLinkPlacement: string
    showEventLinkPanel: boolean
    suggestedSettlementPlacement: string
    showSuggestedSettlementsPanel: boolean
    showHistoryPanel: boolean
    showExpensesPanel: boolean
    showSettlementPaymentsPanel: boolean
    historyOrder: string
  }
}

const eventPageLayoutPolicy = {
  participantPlacement: 'addExpense',
  showParticipantsPanel: false,
  eventLinkPlacement: 'expenseDefaults',
  showEventLinkPanel: false,
  suggestedSettlementPlacement: 'settlementPayment',
  showSuggestedSettlementsPanel: false,
  showHistoryPanel: true,
  showExpensesPanel: false,
  showSettlementPaymentsPanel: false,
  historyOrder: 'newest-first'
} as const

const currentParticipantDefaultsPolicy = {
  visible: true,
  label: 'Expense defaults',
  selectorLabel: 'Expense defaults Participant',
  switchLabel: 'Switch',
  impliesLoginOrPermissions: false
} as const

export function composeEventPagePolicy(
  eventSnapshot: EventPageSnapshot,
  isSettlementFocus: boolean
): EventPagePolicy {
  const suggestedSettlements = eventSnapshot.suggestedSettlements || []
  const expenses = eventSnapshot.expenses || []
  const settlementPayments = eventSnapshot.settlementPayments || []
  const hasSuggestedSettlements = suggestedSettlements.length > 0
  const inFocus = Boolean(isSettlementFocus && hasSuggestedSettlements)
  const canRecordSettlementPayment = eventSnapshot.participants.length >= 2
  const historyItems = eventHistoryItems({ ...eventSnapshot, expenses, settlementPayments })

  return {
    startGuidance: eventStartGuidance({ ...eventSnapshot, expenses }),
    suggestedSettlements: {
      inFocus,
      showSettlementFocus: hasSuggestedSettlements,
      showCopySummary: inFocus,
      showSuggestionCount: hasSuggestedSettlements,
      settlementFocusLabel: inFocus ? 'Exit settle up' : 'Settle up',
      settlementFocusButtonClass: inFocus ? 'secondary' : '',
      recordButtonClass: inFocus ? '' : 'secondary'
    },
    settlementPaymentForm: {
      canRecord: canRecordSettlementPayment,
      disabledReason: canRecordSettlementPayment ? '' : 'Add another Participant before recording a Settlement Payment.'
    },
    participants: {
      deleteById: Object.fromEntries(eventSnapshot.participants.map((participant) => [
        participant.id,
        participantDeleteState({ ...eventSnapshot, expenses, settlementPayments }, participant.id)
      ]))
    },
    currentParticipantDefaults: currentParticipantDefaultsPolicy,
    eventLink: {
      showCopy: true,
      placement: eventPageLayoutPolicy.eventLinkPlacement,
      showPanel: eventPageLayoutPolicy.showEventLinkPanel
    },
    taskRegions: {
      balances: {
        visible: true
      },
      addExpense: {
        visible: true,
        participantPlacement: eventPageLayoutPolicy.participantPlacement
      },
      recordSettlementPayment: {
        visible: true,
        suggestedSettlementPlacement: eventPageLayoutPolicy.suggestedSettlementPlacement
      },
      eventHistory: {
        visible: eventPageLayoutPolicy.showHistoryPanel,
        order: eventPageLayoutPolicy.historyOrder,
        itemCount: historyItems.length
      }
    },
    eventHistory: {
      visible: eventPageLayoutPolicy.showHistoryPanel,
      order: eventPageLayoutPolicy.historyOrder,
      items: historyItems
    },
    layout: eventPageLayoutPolicy
  }
}

export function eventStartGuidance(eventSnapshot: Pick<EventPageSnapshot, 'participants' | 'expenses'>): EventPageStartGuidance {
  const hasOneParticipant = eventSnapshot.participants.length === 1
  const hasNoExpenses = eventSnapshot.expenses.length === 0
  if (hasOneParticipant && hasNoExpenses) {
    return {
      visible: true,
      target: '[data-participant-form]',
      title: 'Add the people sharing this Event',
      copy: 'Start with Participants, then record the first shared cost.',
      action: 'Add Participant'
    }
  }

  if (eventSnapshot.participants.length > 1 && hasNoExpenses) {
    return {
      visible: true,
      target: '[data-expense-form]',
      title: 'Record the first shared cost',
      copy: 'Participants are ready. Add an Expense when someone pays for the group.',
      action: 'Add Expense'
    }
  }

  return {
    visible: false,
    target: '',
    title: '',
    copy: '',
    action: ''
  }
}

export function eventHistoryItems(eventSnapshot: Pick<EventPageSnapshot, 'expenses' | 'settlementPayments'>): EventHistoryItem[] {
  const expenses = (eventSnapshot.expenses || []).map((record) => ({
    kind: 'expense' as const,
    record,
    occurredAt: record.createdAt || record.updatedAt || ''
  }))
  const settlementPayments = (eventSnapshot.settlementPayments || []).map((record) => ({
    kind: 'settlementPayment' as const,
    record,
    occurredAt: record.createdAt || record.updatedAt || ''
  }))

  const items: EventHistoryItem[] = [...expenses, ...settlementPayments]
  return items.sort((left, right) => {
    const byTime = right.occurredAt.localeCompare(left.occurredAt)
    if (byTime !== 0) return byTime
    if (left.kind !== right.kind) return left.kind === 'expense' ? -1 : 1
    return left.record.id.localeCompare(right.record.id)
  })
}

export function participantDeleteState(
  eventSnapshot: Pick<EventPageSnapshot, 'participants' | 'expenses' | 'settlementPayments'>,
  participantId: string
): EventPageParticipantDeleteState {
  if (eventSnapshot.participants.length <= 1) {
    return { canDelete: false, reason: 'Keep at least one Participant in the Event.' }
  }
  if (isParticipantReferencedInSnapshot(eventSnapshot, participantId)) {
    return { canDelete: false, reason: 'Referenced Participants cannot be deleted.' }
  }
  return { canDelete: true, reason: '' }
}

export function isParticipantReferencedInSnapshot(
  eventSnapshot: Pick<EventPageSnapshot, 'expenses' | 'settlementPayments'>,
  participantId: string
): boolean {
  return (eventSnapshot.expenses || []).some((expense) =>
    expense.payerParticipantId === participantId ||
    expense.shares.some((share) => share.participantId === participantId)
  ) || (eventSnapshot.settlementPayments || []).some((payment) =>
    payment.senderParticipantId === participantId || payment.recipientParticipantId === participantId
  )
}

export const clientEventPagePolicyScript = [
  `const eventPageLayoutPolicy = ${JSON.stringify(eventPageLayoutPolicy)}`,
  `const currentParticipantDefaultsPolicy = ${JSON.stringify(currentParticipantDefaultsPolicy)}`,
  composeEventPagePolicy.toString(),
  eventStartGuidance.toString(),
  eventHistoryItems.toString(),
  participantDeleteState.toString(),
  isParticipantReferencedInSnapshot.toString(),
  String.raw`
function panelActionState(eventSnapshot, isSettlementFocus) {
  return composeEventPagePolicy(eventSnapshot, isSettlementFocus)
}

function historyItems(eventSnapshot) {
  return eventHistoryItems(eventSnapshot)
}
`
].join('\n\n')
