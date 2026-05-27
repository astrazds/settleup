import {
  addParticipantToEvent,
  cloneEventRecord,
  createEventRecord,
  createExpenseInEvent,
  createSettlementPaymentInEvent,
  deleteExpenseFromEvent,
  deleteParticipantFromEvent,
  deleteSettlementPaymentFromEvent,
  eventSnapshot,
  newEventToken,
  renameParticipantInEvent,
  updateExpenseInEvent,
  updateSettlementPaymentInEvent
} from './event-record'
import type { CreateEventInput, EventRecord } from './event-record'
import type {
  EventSnapshot,
  EventSummary,
  Expense,
  ExpenseInput,
  Participant,
  SettlementPayment,
  SettlementPaymentInput,
  Share
} from './domain'
import { StoreError } from './errors'

export { StoreError } from './errors'

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results?: T[] }>
  run(): Promise<unknown>
}

export interface AppStore {
  createEvent(input: CreateEventInput): Promise<EventSnapshot>
  getEventByToken(token: string): Promise<EventSnapshot | null>
  addParticipant(token: string, displayName: string): Promise<EventSnapshot>
  renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot>
  deleteParticipant(token: string, participantId: string): Promise<EventSnapshot>
  createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot>
  updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot>
  deleteExpense(token: string, expenseId: string): Promise<EventSnapshot>
  createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot>
  updateSettlementPayment(token: string, settlementPaymentId: string, input: SettlementPaymentInput): Promise<EventSnapshot>
  deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot>
}

export class MemoryStore implements AppStore {
  private readonly events = new Map<string, EventRecord>()

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    const now = new Date().toISOString()
    let token = newEventToken()
    while (this.events.has(token)) {
      token = newEventToken()
    }

    const record = createEventRecord(input, {
      eventId: crypto.randomUUID(),
      participantId: crypto.randomUUID(),
      token,
      now
    })

    this.events.set(token, record)
    return eventSnapshot(record)
  }

  async getEventByToken(token: string): Promise<EventSnapshot | null> {
    const stored = this.events.get(token)
    return stored ? eventSnapshot(stored) : null
  }

  async addParticipant(token: string, displayName: string): Promise<EventSnapshot> {
    const next = addParticipantToEvent(this.requireEvent(token), displayName, {
      participantId: crypto.randomUUID(),
      now: new Date().toISOString()
    })
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot> {
    const next = renameParticipantInEvent(this.requireEvent(token), participantId, displayName, new Date().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
    const next = deleteParticipantFromEvent(this.requireEvent(token), participantId, new Date().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot> {
    const next = createExpenseInEvent(this.requireEvent(token), input, {
      expenseId: crypto.randomUUID(),
      now: new Date().toISOString()
    })
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot> {
    const next = updateExpenseInEvent(this.requireEvent(token), expenseId, input, new Date().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
    const next = deleteExpenseFromEvent(this.requireEvent(token), expenseId, new Date().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot> {
    const next = createSettlementPaymentInEvent(this.requireEvent(token), input, {
      settlementPaymentId: crypto.randomUUID(),
      now: new Date().toISOString()
    })
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async updateSettlementPayment(
    token: string,
    settlementPaymentId: string,
    input: SettlementPaymentInput
  ): Promise<EventSnapshot> {
    const next = updateSettlementPaymentInEvent(
      this.requireEvent(token),
      settlementPaymentId,
      input,
      new Date().toISOString()
    )
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot> {
    const next = deleteSettlementPaymentFromEvent(this.requireEvent(token), settlementPaymentId, new Date().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  private requireEvent(token: string): EventRecord {
    const stored = this.events.get(token)
    if (!stored) {
      throw new StoreError('Event not found', 404)
    }
    return cloneEventRecord(stored)
  }
}

export class D1Store implements AppStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const token = newEventToken()
      const existing = await this.db.prepare('select id from events where token = ?').bind(token).first()
      if (!existing) {
        const record = createEventRecord(input, {
          eventId: crypto.randomUUID(),
          participantId: crypto.randomUUID(),
          token,
          now: new Date().toISOString()
        })
        const participant = record.participants[0]
        if (!participant) {
          throw new StoreError('Event requires a first Participant', 500)
        }
        await this.db.batch([
          this.db
            .prepare(
              'insert into events (id, token, title, currency, created_at, updated_at) values (?, ?, ?, ?, ?, ?)'
            )
            .bind(
              record.event.id,
              record.event.token,
              record.event.title,
              record.event.currency,
              record.event.createdAt,
              record.event.updatedAt
            ),
          this.db
            .prepare(
              'insert into participants (id, event_id, display_name, sort_order, created_at) values (?, ?, ?, ?, ?)'
            )
            .bind(participant.id, record.event.id, participant.displayName, participant.order, participant.createdAt)
        ])
        return this.snapshotByToken(token)
      }
    }

    throw new StoreError('Could not create Event Link', 500)
  }

  async getEventByToken(token: string): Promise<EventSnapshot | null> {
    const event = await this.eventByToken(token)
    if (!event) {
      return null
    }
    return this.snapshotByToken(token)
  }

  async addParticipant(token: string, displayName: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = addParticipantToEvent(stored, displayName, {
      participantId: crypto.randomUUID(),
      now: new Date().toISOString()
    })
    const participant = next.participants.at(-1)
    if (!participant) {
      throw new StoreError('Event requires a Participant', 500)
    }
    await this.db.batch([
      this.db
        .prepare(
          'insert into participants (id, event_id, display_name, sort_order, created_at) values (?, ?, ?, ?, ?)'
        )
        .bind(participant.id, stored.event.id, participant.displayName, participant.order, participant.createdAt),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = renameParticipantInEvent(stored, participantId, displayName, new Date().toISOString())
    const participant = next.participants.find((candidate) => candidate.id === participantId)
    if (!participant) {
      throw new StoreError('Participant not found', 404)
    }
    await this.db.batch([
      this.db
        .prepare('update participants set display_name = ? where event_id = ? and id = ?')
        .bind(participant.displayName, stored.event.id, participant.id),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = deleteParticipantFromEvent(stored, participantId, new Date().toISOString())
    await this.db.batch([
      this.db.prepare('delete from participants where event_id = ? and id = ?').bind(stored.event.id, participantId),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = createExpenseInEvent(stored, input, {
      expenseId: crypto.randomUUID(),
      now: new Date().toISOString()
    })
    const expense = next.expenses.at(-1)
    if (!expense) {
      throw new StoreError('Expense not found', 500)
    }
    await this.db.batch([
      this.db
        .prepare(
          'insert into expenses (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          expense.id,
          stored.event.id,
          expense.description,
          expense.amountMinor,
          expense.payerParticipantId,
          expense.createdAt,
          expense.updatedAt
        ),
      ...this.insertShareStatements(expense.id, expense.shares),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = updateExpenseInEvent(stored, expenseId, input, new Date().toISOString())
    const expense = next.expenses.find((candidate) => candidate.id === expenseId)
    if (!expense) {
      throw new StoreError('Expense not found', 404)
    }
    await this.db.batch([
      this.db
        .prepare(
          'update expenses set description = ?, amount_minor = ?, payer_participant_id = ?, updated_at = ? where event_id = ? and id = ?'
        )
        .bind(
          expense.description,
          expense.amountMinor,
          expense.payerParticipantId,
          expense.updatedAt,
          stored.event.id,
          expense.id
        ),
      this.db.prepare('delete from shares where expense_id = ?').bind(expenseId),
      ...this.insertShareStatements(expense.id, expense.shares),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = deleteExpenseFromEvent(stored, expenseId, new Date().toISOString())
    await this.db.batch([
      this.db.prepare('delete from shares where expense_id = ?').bind(expenseId),
      this.db.prepare('delete from expenses where event_id = ? and id = ?').bind(stored.event.id, expenseId),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = createSettlementPaymentInEvent(stored, input, {
      settlementPaymentId: crypto.randomUUID(),
      now: new Date().toISOString()
    })
    const settlementPayment = next.settlementPayments.at(-1)
    if (!settlementPayment) {
      throw new StoreError('Settlement Payment not found', 500)
    }
    await this.db.batch([
      this.db
        .prepare(
          'insert into settlement_payments (id, event_id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          settlementPayment.id,
          stored.event.id,
          settlementPayment.senderParticipantId,
          settlementPayment.recipientParticipantId,
          settlementPayment.amountMinor,
          settlementPayment.createdAt,
          settlementPayment.updatedAt
        ),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async updateSettlementPayment(
    token: string,
    settlementPaymentId: string,
    input: SettlementPaymentInput
  ): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = updateSettlementPaymentInEvent(stored, settlementPaymentId, input, new Date().toISOString())
    const settlementPayment = next.settlementPayments.find((candidate) => candidate.id === settlementPaymentId)
    if (!settlementPayment) {
      throw new StoreError('Settlement Payment not found', 404)
    }
    await this.db.batch([
      this.db
        .prepare(
          'update settlement_payments set sender_participant_id = ?, recipient_participant_id = ?, amount_minor = ?, updated_at = ? where event_id = ? and id = ?'
        )
        .bind(
          settlementPayment.senderParticipantId,
          settlementPayment.recipientParticipantId,
          settlementPayment.amountMinor,
          settlementPayment.updatedAt,
          stored.event.id,
          settlementPayment.id
        ),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  async deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = deleteSettlementPaymentFromEvent(stored, settlementPaymentId, new Date().toISOString())
    await this.db.batch([
      this.db
        .prepare('delete from settlement_payments where event_id = ? and id = ?')
        .bind(stored.event.id, settlementPaymentId),
      this.touchEventStatement(stored.event.id, next.event.updatedAt)
    ])
    return this.snapshotByToken(token)
  }

  private insertShareStatements(expenseId: string, shares: Share[]): D1PreparedStatementLike[] {
    return shares.map((share) =>
      this.db
        .prepare('insert into shares (id, expense_id, participant_id, amount_minor) values (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), expenseId, share.participantId, share.amountMinor)
    )
  }

  private async snapshotByToken(token: string): Promise<EventSnapshot> {
    return eventSnapshot(await this.rawSnapshot(token))
  }

  private async rawSnapshot(token: string): Promise<EventRecord> {
    const event = await this.eventByToken(token)
    if (!event) {
      throw new StoreError('Event not found', 404)
    }
    const participants = await this.participantsForEvent(event.id)
    const expenses = await this.expensesForEvent(event.id)
    const settlementPayments = await this.settlementPaymentsForEvent(event.id)
    return { event, participants, expenses, settlementPayments }
  }

  private async eventByToken(token: string): Promise<EventSummary | null> {
    const row = await this.db
      .prepare('select id, token, title, currency, created_at, updated_at from events where token = ?')
      .bind(token)
      .first<EventRow>()
    if (!row) {
      return null
    }
    return eventFromRow(row)
  }

  private async participantsForEvent(eventId: string): Promise<Participant[]> {
    const rows = await this.db
      .prepare('select id, display_name, sort_order, created_at from participants where event_id = ? order by sort_order asc')
      .bind(eventId)
      .all<ParticipantRow>()
    return (rows.results ?? []).map(participantFromRow)
  }

  private async expensesForEvent(eventId: string): Promise<Expense[]> {
    const expenseRows = await this.db
      .prepare(
        'select id, description, amount_minor, payer_participant_id, created_at, updated_at from expenses where event_id = ? order by created_at desc'
      )
      .bind(eventId)
      .all<ExpenseRow>()
    const expenses: Expense[] = []
    for (const row of expenseRows.results ?? []) {
      const shares = await this.db
        .prepare('select participant_id, amount_minor from shares where expense_id = ? order by id asc')
        .bind(row.id)
        .all<ShareRow>()
      expenses.push(expenseFromRow(row, (shares.results ?? []).map(shareFromRow)))
    }
    return expenses
  }

  private async settlementPaymentsForEvent(eventId: string): Promise<SettlementPayment[]> {
    const rows = await this.db
      .prepare(
        'select id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at from settlement_payments where event_id = ? order by created_at desc'
      )
      .bind(eventId)
      .all<SettlementPaymentRow>()
    return (rows.results ?? []).map(settlementPaymentFromRow)
  }

  private touchEventStatement(eventId: string, now = new Date().toISOString()): D1PreparedStatementLike {
    return this.db.prepare('update events set updated_at = ? where id = ?').bind(now, eventId)
  }
}

interface EventRow {
  id: string
  token: string
  title: string
  currency: string
  created_at: string
  updated_at: string
}

interface ParticipantRow {
  id: string
  display_name: string
  sort_order: number
  created_at: string
}

interface ExpenseRow {
  id: string
  description: string
  amount_minor: number
  payer_participant_id: string
  created_at: string
  updated_at: string
}

interface ShareRow {
  participant_id: string
  amount_minor: number
}

interface SettlementPaymentRow {
  id: string
  sender_participant_id: string
  recipient_participant_id: string
  amount_minor: number
  created_at: string
  updated_at: string
}

function eventFromRow(row: EventRow): EventSummary {
  return {
    id: row.id,
    token: row.token,
    title: row.title,
    currency: row.currency,
    eventLinkPath: `/e/${row.token}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function participantFromRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    displayName: row.display_name,
    order: row.sort_order,
    createdAt: row.created_at
  }
}

function expenseFromRow(row: ExpenseRow, shares: Share[]): Expense {
  return {
    id: row.id,
    description: row.description,
    amountMinor: row.amount_minor,
    payerParticipantId: row.payer_participant_id,
    shares,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function shareFromRow(row: ShareRow): Share {
  return {
    participantId: row.participant_id,
    amountMinor: row.amount_minor
  }
}

function settlementPaymentFromRow(row: SettlementPaymentRow): SettlementPayment {
  return {
    id: row.id,
    senderParticipantId: row.sender_participant_id,
    recipientParticipantId: row.recipient_participant_id,
    amountMinor: row.amount_minor,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
