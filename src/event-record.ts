import {
  createEventToken,
  validateExpenseInput,
  validateSettlementPaymentInput,
  withDerived
} from './domain'
import type {
  EventSnapshot,
  EventSummary,
  Expense,
  ExpenseInput,
  Participant,
  SettlementPayment,
  SettlementPaymentInput,
  Share,
  SupportedCurrency
} from './domain'
import { StoreError } from './errors'

export interface CreateEventInput {
  title: string
  currency: SupportedCurrency
  displayName: string
}

export interface EventRecord {
  event: EventSummary
  participants: Participant[]
  expenses: Expense[]
  settlementPayments: SettlementPayment[]
}

export interface CreateEventRecordIds {
  eventId: string
  participantId: string
  token: string
  now: string
}

export interface AddParticipantIds {
  participantId: string
  now: string
}

export interface CreateExpenseIds {
  expenseId: string
  now: string
}

export interface CreateSettlementPaymentIds {
  settlementPaymentId: string
  now: string
}

export function createEventRecord(input: CreateEventInput, ids: CreateEventRecordIds): EventRecord {
  return {
    event: {
      id: ids.eventId,
      token: ids.token,
      title: input.title,
      currency: input.currency,
      eventLinkPath: `/e/${ids.token}`,
      createdAt: ids.now,
      updatedAt: ids.now
    },
    participants: [
      {
        id: ids.participantId,
        displayName: input.displayName,
        order: 1,
        createdAt: ids.now
      }
    ],
    expenses: [],
    settlementPayments: []
  }
}

export function addParticipantToEvent(record: EventRecord, displayName: string, ids: AddParticipantIds): EventRecord {
  return touchRecord({
    ...cloneEventRecord(record),
    participants: [
      ...record.participants.map((participant) => ({ ...participant })),
      {
        id: ids.participantId,
        displayName,
        order: nextParticipantOrder(record.participants),
        createdAt: ids.now
      }
    ]
  }, ids.now)
}

export function renameParticipantInEvent(
  record: EventRecord,
  participantId: string,
  displayName: string,
  now: string
): EventRecord {
  requireParticipant(record.participants, participantId)
  return touchRecord({
    ...cloneEventRecord(record),
    participants: record.participants.map((participant) =>
      participant.id === participantId ? { ...participant, displayName } : { ...participant }
    )
  }, now)
}

export function deleteParticipantFromEvent(record: EventRecord, participantId: string, now: string): EventRecord {
  requireParticipant(record.participants, participantId)
  if (isParticipantReferenced(record, participantId)) {
    throw new StoreError('Referenced Participants cannot be deleted')
  }
  return touchRecord({
    ...cloneEventRecord(record),
    participants: record.participants
      .filter((participant) => participant.id !== participantId)
      .map((participant) => ({ ...participant }))
  }, now)
}

export function createExpenseInEvent(record: EventRecord, input: ExpenseInput, ids: CreateExpenseIds): EventRecord {
  assertValidExpense(input, record.participants)
  return touchRecord({
    ...cloneEventRecord(record),
    expenses: [
      ...record.expenses.map(cloneExpense),
      {
        id: ids.expenseId,
        ...input,
        shares: cloneShares(input.shares),
        createdAt: ids.now,
        updatedAt: ids.now
      }
    ]
  }, ids.now)
}

export function updateExpenseInEvent(
  record: EventRecord,
  expenseId: string,
  input: ExpenseInput,
  now: string
): EventRecord {
  assertValidExpense(input, record.participants)
  requireExpense(record.expenses, expenseId)
  return touchRecord({
    ...cloneEventRecord(record),
    expenses: record.expenses.map((expense) =>
      expense.id === expenseId
        ? {
            ...expense,
            description: input.description,
            amountMinor: input.amountMinor,
            payerParticipantId: input.payerParticipantId,
            shares: cloneShares(input.shares),
            updatedAt: now
          }
        : cloneExpense(expense)
    )
  }, now)
}

export function deleteExpenseFromEvent(record: EventRecord, expenseId: string, now: string): EventRecord {
  requireExpense(record.expenses, expenseId)
  return touchRecord({
    ...cloneEventRecord(record),
    expenses: record.expenses.filter((expense) => expense.id !== expenseId).map(cloneExpense)
  }, now)
}

export function createSettlementPaymentInEvent(
  record: EventRecord,
  input: SettlementPaymentInput,
  ids: CreateSettlementPaymentIds
): EventRecord {
  assertValidSettlementPayment(input, record.participants)
  return touchRecord({
    ...cloneEventRecord(record),
    settlementPayments: [
      ...record.settlementPayments.map((payment) => ({ ...payment })),
      {
        id: ids.settlementPaymentId,
        ...input,
        createdAt: ids.now,
        updatedAt: ids.now
      }
    ]
  }, ids.now)
}

export function updateSettlementPaymentInEvent(
  record: EventRecord,
  settlementPaymentId: string,
  input: SettlementPaymentInput,
  now: string
): EventRecord {
  assertValidSettlementPayment(input, record.participants)
  requireSettlementPayment(record.settlementPayments, settlementPaymentId)
  return touchRecord({
    ...cloneEventRecord(record),
    settlementPayments: record.settlementPayments.map((payment) =>
      payment.id === settlementPaymentId
        ? {
            ...payment,
            senderParticipantId: input.senderParticipantId,
            recipientParticipantId: input.recipientParticipantId,
            amountMinor: input.amountMinor,
            updatedAt: now
          }
        : { ...payment }
    )
  }, now)
}

export function deleteSettlementPaymentFromEvent(
  record: EventRecord,
  settlementPaymentId: string,
  now: string
): EventRecord {
  requireSettlementPayment(record.settlementPayments, settlementPaymentId)
  return touchRecord({
    ...cloneEventRecord(record),
    settlementPayments: record.settlementPayments
      .filter((payment) => payment.id !== settlementPaymentId)
      .map((payment) => ({ ...payment }))
  }, now)
}

export function eventSnapshot(record: EventRecord): EventSnapshot {
  return withDerived(cloneEventRecord(record))
}

export function cloneEventRecord(record: EventRecord): EventRecord {
  return {
    event: { ...record.event },
    participants: record.participants.map((participant) => ({ ...participant })),
    expenses: record.expenses.map(cloneExpense),
    settlementPayments: record.settlementPayments.map((payment) => ({ ...payment }))
  }
}

export function newEventToken(): string {
  return createEventToken()
}

function touchRecord(record: EventRecord, now: string): EventRecord {
  return {
    ...record,
    event: {
      ...record.event,
      updatedAt: now
    }
  }
}

function assertValidExpense(input: ExpenseInput, participants: Participant[]): void {
  const validation = validateExpenseInput(input, participants)
  if (!validation.ok) {
    throw new StoreError(validation.message)
  }
}

function assertValidSettlementPayment(input: SettlementPaymentInput, participants: Participant[]): void {
  const validation = validateSettlementPaymentInput(input, participants)
  if (!validation.ok) {
    throw new StoreError(validation.message)
  }
}

function requireParticipant(participants: Participant[], participantId: string): void {
  if (!participants.some((participant) => participant.id === participantId)) {
    throw new StoreError('Participant not found', 404)
  }
}

function requireExpense(expenses: Expense[], expenseId: string): void {
  if (!expenses.some((expense) => expense.id === expenseId)) {
    throw new StoreError('Expense not found', 404)
  }
}

function requireSettlementPayment(settlementPayments: SettlementPayment[], settlementPaymentId: string): void {
  if (!settlementPayments.some((settlementPayment) => settlementPayment.id === settlementPaymentId)) {
    throw new StoreError('Settlement Payment not found', 404)
  }
}

function isParticipantReferenced(record: EventRecord, participantId: string): boolean {
  return (
    record.expenses.some(
      (expense) =>
        expense.payerParticipantId === participantId ||
        expense.shares.some((share) => share.participantId === participantId)
    ) ||
    record.settlementPayments.some(
      (payment) =>
        payment.senderParticipantId === participantId || payment.recipientParticipantId === participantId
    )
  )
}

function cloneExpense(expense: Expense): Expense {
  return {
    ...expense,
    shares: cloneShares(expense.shares)
  }
}

function cloneShares(shares: Share[]): Share[] {
  return shares.map((share) => ({ ...share }))
}

function nextParticipantOrder(participants: Participant[]): number {
  return Math.max(0, ...participants.map((participant) => participant.order)) + 1
}
