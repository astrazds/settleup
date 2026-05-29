import type { EventSummary, Expense, Participant, SettlementPayment, Share } from './domain'
import type { EventRecord } from './event-record'

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

export interface EventRecordPersistence {
  create(record: EventRecord): Promise<void>
  replace(record: EventRecord): Promise<void>
  findByToken(token: string): Promise<EventRecord | null>
  deleteCreatedBefore(cutoff: string): Promise<void>
}

export class D1EventRecordPersistence implements EventRecordPersistence {
  constructor(private readonly db: D1DatabaseLike) {}

  async create(record: EventRecord): Promise<void> {
    await this.db.batch([
      this.insertEventStatement(record.event),
      ...this.insertParticipantStatements(record),
      ...this.insertExpenseStatements(record),
      ...this.insertSettlementPaymentStatements(record)
    ])
  }

  async replace(record: EventRecord): Promise<void> {
    await this.db.batch([
      this.db
        .prepare('delete from shares where expense_id in (select id from expenses where event_id = ?)')
        .bind(record.event.id),
      this.db.prepare('delete from settlement_payments where event_id = ?').bind(record.event.id),
      this.db.prepare('delete from expenses where event_id = ?').bind(record.event.id),
      this.db.prepare('delete from participants where event_id = ?').bind(record.event.id),
      ...this.insertParticipantStatements(record),
      ...this.insertExpenseStatements(record),
      ...this.insertSettlementPaymentStatements(record),
      this.updateEventStatement(record.event)
    ])
  }

  async findByToken(token: string): Promise<EventRecord | null> {
    const row = await this.db
      .prepare('select id, token, title, currency, created_at, updated_at from events where token = ?')
      .bind(token)
      .first<EventRow>()
    if (!row) {
      return null
    }

    return {
      event: eventFromRow(row),
      participants: await this.participantsForEvent(row.id),
      expenses: await this.expensesForEvent(row.id),
      settlementPayments: await this.settlementPaymentsForEvent(row.id)
    }
  }

  async deleteCreatedBefore(cutoff: string): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          `delete from shares
          where expense_id in (
            select expenses.id
            from expenses
            inner join events on events.id = expenses.event_id
            where events.created_at <= ?
          )`
        )
        .bind(cutoff),
      this.db
        .prepare('delete from settlement_payments where event_id in (select id from events where created_at <= ?)')
        .bind(cutoff),
      this.db
        .prepare('delete from expenses where event_id in (select id from events where created_at <= ?)')
        .bind(cutoff),
      this.db
        .prepare('delete from participants where event_id in (select id from events where created_at <= ?)')
        .bind(cutoff),
      this.db.prepare('delete from events where created_at <= ?').bind(cutoff)
    ])
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
    const shareRows = await this.db
      .prepare(
        `select
          s.expense_id,
          s.participant_id,
          s.amount_minor
        from shares s
        inner join expenses e on e.id = s.expense_id
        inner join participants p on p.id = s.participant_id
        where e.event_id = ?
        order by e.created_at desc, e.id asc, p.sort_order asc`
      )
      .bind(eventId)
      .all<ShareRow>()
    const sharesByExpenseId = sharesByExpense(shareRows.results ?? [])

    return (expenseRows.results ?? []).map((row) => expenseFromRow(row, sharesByExpenseId.get(row.id) ?? []))
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

  private insertEventStatement(event: EventSummary): D1PreparedStatementLike {
    return this.db
      .prepare('insert into events (id, token, title, currency, created_at, updated_at) values (?, ?, ?, ?, ?, ?)')
      .bind(event.id, event.token, event.title, event.currency, event.createdAt, event.updatedAt)
  }

  private updateEventStatement(event: EventSummary): D1PreparedStatementLike {
    return this.db
      .prepare('update events set token = ?, title = ?, currency = ?, created_at = ?, updated_at = ? where id = ?')
      .bind(event.token, event.title, event.currency, event.createdAt, event.updatedAt, event.id)
  }

  private insertParticipantStatements(record: EventRecord): D1PreparedStatementLike[] {
    return record.participants.map((participant) =>
      this.db
        .prepare(
          'insert into participants (id, event_id, display_name, sort_order, created_at) values (?, ?, ?, ?, ?)'
        )
        .bind(participant.id, record.event.id, participant.displayName, participant.order, participant.createdAt)
    )
  }

  private insertExpenseStatements(record: EventRecord): D1PreparedStatementLike[] {
    return record.expenses.flatMap((expense) => [
      this.db
        .prepare(
          'insert into expenses (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          expense.id,
          record.event.id,
          expense.description,
          expense.amountMinor,
          expense.payerParticipantId,
          expense.createdAt,
          expense.updatedAt
        ),
      ...this.insertShareStatements(expense)
    ])
  }

  private insertShareStatements(expense: Expense): D1PreparedStatementLike[] {
    return expense.shares.map((share) =>
      this.db
        .prepare('insert into shares (id, expense_id, participant_id, amount_minor) values (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), expense.id, share.participantId, share.amountMinor)
    )
  }

  private insertSettlementPaymentStatements(record: EventRecord): D1PreparedStatementLike[] {
    return record.settlementPayments.map((settlementPayment) =>
      this.db
        .prepare(
          'insert into settlement_payments (id, event_id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          settlementPayment.id,
          record.event.id,
          settlementPayment.senderParticipantId,
          settlementPayment.recipientParticipantId,
          settlementPayment.amountMinor,
          settlementPayment.createdAt,
          settlementPayment.updatedAt
        )
    )
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
  expense_id: string
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

function sharesByExpense(rows: ShareRow[]): Map<string, Share[]> {
  const shares = new Map<string, Share[]>()
  for (const row of rows) {
    const expenseShares = shares.get(row.expense_id) ?? []
    expenseShares.push(shareFromRow(row))
    shares.set(row.expense_id, expenseShares)
  }
  return shares
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
