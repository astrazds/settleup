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

export interface EventPageSnapshot {
  participants: readonly EventPageParticipant[]
  expenses: readonly EventPageExpense[]
  settlementPayments: readonly EventPageSettlementPayment[]
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
    showHistoryPanel: boolean
    historyOrder: string
  }
}

const eventPageLayoutPolicy = {
  participantPlacement: 'addExpense',
  showParticipantsPanel: false,
  eventLinkPlacement: 'expenseDefaults',
  showEventLinkPanel: false,
  showHistoryPanel: true,
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
  eventSnapshot: EventPageSnapshot
): EventPagePolicy {
  const expenses = eventSnapshot.expenses || []
  const settlementPayments = eventSnapshot.settlementPayments || []
  const canRecordSettlementPayment = eventSnapshot.participants.length >= 2
  const historyItems = eventHistoryItems({ ...eventSnapshot, expenses, settlementPayments })

  return {
    startGuidance: eventStartGuidance({ ...eventSnapshot, expenses }),
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
        visible: true
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
  String.raw`
function composeEventPagePolicy(eventSnapshot) {
  const expenses = eventSnapshot.expenses || []
  const settlementPayments = eventSnapshot.settlementPayments || []
  const canRecordSettlementPayment = eventSnapshot.participants.length >= 2
  const orderedHistoryItems = eventHistoryItems({ ...eventSnapshot, expenses, settlementPayments })

  return {
    startGuidance: eventStartGuidance({ ...eventSnapshot, expenses }),
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
        visible: true
      },
      eventHistory: {
        visible: eventPageLayoutPolicy.showHistoryPanel,
        order: eventPageLayoutPolicy.historyOrder,
        itemCount: orderedHistoryItems.length
      }
    },
    eventHistory: {
      visible: eventPageLayoutPolicy.showHistoryPanel,
      order: eventPageLayoutPolicy.historyOrder,
      items: orderedHistoryItems
    },
    layout: eventPageLayoutPolicy
  }
}

function eventStartGuidance(eventSnapshot) {
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

function eventHistoryItems(eventSnapshot) {
  const expenses = (eventSnapshot.expenses || []).map((record) => ({
    kind: 'expense',
    record,
    occurredAt: record.createdAt || record.updatedAt || ''
  }))
  const settlementPayments = (eventSnapshot.settlementPayments || []).map((record) => ({
    kind: 'settlementPayment',
    record,
    occurredAt: record.createdAt || record.updatedAt || ''
  }))

  return [...expenses, ...settlementPayments].sort((left, right) => {
    const byTime = right.occurredAt.localeCompare(left.occurredAt)
    if (byTime !== 0) return byTime
    if (left.kind !== right.kind) return left.kind === 'expense' ? -1 : 1
    return left.record.id.localeCompare(right.record.id)
  })
}

function participantDeleteState(eventSnapshot, participantId) {
  if (eventSnapshot.participants.length <= 1) {
    return { canDelete: false, reason: 'Keep at least one Participant in the Event.' }
  }
  if (isParticipantReferencedInSnapshot(eventSnapshot, participantId)) {
    return { canDelete: false, reason: 'Referenced Participants cannot be deleted.' }
  }
  return { canDelete: true, reason: '' }
}

function isParticipantReferencedInSnapshot(eventSnapshot, participantId) {
  return (eventSnapshot.expenses || []).some((expense) =>
    expense.payerParticipantId === participantId ||
    expense.shares.some((share) => share.participantId === participantId)
  ) || (eventSnapshot.settlementPayments || []).some((payment) =>
    payment.senderParticipantId === participantId || payment.recipientParticipantId === participantId
  )
}

function panelActionState(eventSnapshot) {
  return composeEventPagePolicy(eventSnapshot)
}

function historyItems(eventSnapshot) {
  return eventHistoryItems(eventSnapshot)
}
`
].join('\n\n')
