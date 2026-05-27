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
  Share
} from './domain'

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results?: T[] }>
  run(): Promise<unknown>
}

export interface CreateEventInput {
  title: string
  currency: string
  displayName: string
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

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
  }
}

export class MemoryStore implements AppStore {
  private readonly events = new Map<string, StoredEvent>()

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    const now = new Date().toISOString()
    let token = createEventToken()
    while (this.events.has(token)) {
      token = createEventToken()
    }

    const event: EventSummary = {
      id: crypto.randomUUID(),
      token,
      title: input.title,
      currency: input.currency,
      eventLinkPath: `/e/${token}`,
      createdAt: now,
      updatedAt: now
    }
    const participant: Participant = {
      id: crypto.randomUUID(),
      displayName: input.displayName,
      order: 1,
      createdAt: now
    }

    this.events.set(token, {
      event,
      participants: [participant],
      expenses: [],
      settlementPayments: []
    })

    return this.snapshot(token)
  }

  async getEventByToken(token: string): Promise<EventSnapshot | null> {
    const stored = this.events.get(token)
    return stored ? withDerived(cloneStoredEvent(stored)) : null
  }

  async addParticipant(token: string, displayName: string): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    stored.participants.push({
      id: crypto.randomUUID(),
      displayName,
      order: nextParticipantOrder(stored.participants),
      createdAt: new Date().toISOString()
    })
    touch(stored.event)
    return this.snapshot(token)
  }

  async renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    const participant = stored.participants.find((candidate) => candidate.id === participantId)
    if (!participant) {
      throw new StoreError('Participant not found', 404)
    }
    participant.displayName = displayName
    touch(stored.event)
    return this.snapshot(token)
  }

  async deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    if (isParticipantReferenced(stored, participantId)) {
      throw new StoreError('Referenced Participants cannot be deleted')
    }
    const nextParticipants = stored.participants.filter((participant) => participant.id !== participantId)
    if (nextParticipants.length === stored.participants.length) {
      throw new StoreError('Participant not found', 404)
    }
    stored.participants = nextParticipants
    touch(stored.event)
    return this.snapshot(token)
  }

  async createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    assertValidExpense(input, stored.participants)
    const now = new Date().toISOString()
    stored.expenses.push({
      id: crypto.randomUUID(),
      ...input,
      shares: cloneShares(input.shares),
      createdAt: now,
      updatedAt: now
    })
    touch(stored.event)
    return this.snapshot(token)
  }

  async updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    assertValidExpense(input, stored.participants)
    const expense = stored.expenses.find((candidate) => candidate.id === expenseId)
    if (!expense) {
      throw new StoreError('Expense not found', 404)
    }
    expense.description = input.description
    expense.amountMinor = input.amountMinor
    expense.payerParticipantId = input.payerParticipantId
    expense.shares = cloneShares(input.shares)
    expense.updatedAt = new Date().toISOString()
    touch(stored.event)
    return this.snapshot(token)
  }

  async deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    const nextExpenses = stored.expenses.filter((expense) => expense.id !== expenseId)
    if (nextExpenses.length === stored.expenses.length) {
      throw new StoreError('Expense not found', 404)
    }
    stored.expenses = nextExpenses
    touch(stored.event)
    return this.snapshot(token)
  }

  async createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    assertValidSettlementPayment(input, stored.participants)
    const now = new Date().toISOString()
    stored.settlementPayments.push({
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now
    })
    touch(stored.event)
    return this.snapshot(token)
  }

  async updateSettlementPayment(
    token: string,
    settlementPaymentId: string,
    input: SettlementPaymentInput
  ): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    assertValidSettlementPayment(input, stored.participants)
    const settlementPayment = stored.settlementPayments.find((candidate) => candidate.id === settlementPaymentId)
    if (!settlementPayment) {
      throw new StoreError('Settlement Payment not found', 404)
    }
    settlementPayment.senderParticipantId = input.senderParticipantId
    settlementPayment.recipientParticipantId = input.recipientParticipantId
    settlementPayment.amountMinor = input.amountMinor
    settlementPayment.updatedAt = new Date().toISOString()
    touch(stored.event)
    return this.snapshot(token)
  }

  async deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot> {
    const stored = this.requireEvent(token)
    const nextSettlementPayments = stored.settlementPayments.filter((payment) => payment.id !== settlementPaymentId)
    if (nextSettlementPayments.length === stored.settlementPayments.length) {
      throw new StoreError('Settlement Payment not found', 404)
    }
    stored.settlementPayments = nextSettlementPayments
    touch(stored.event)
    return this.snapshot(token)
  }

  private requireEvent(token: string): StoredEvent {
    const stored = this.events.get(token)
    if (!stored) {
      throw new StoreError('Event not found', 404)
    }
    return stored
  }

  private snapshot(token: string): EventSnapshot {
    return withDerived(cloneStoredEvent(this.requireEvent(token)))
  }
}

export class D1Store implements AppStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    const now = new Date().toISOString()
    const eventId = crypto.randomUUID()
    const participantId = crypto.randomUUID()
    let token = createEventToken()

    for (let attempts = 0; attempts < 5; attempts += 1) {
      const existing = await this.db.prepare('select id from events where token = ?').bind(token).first()
      if (!existing) {
        break
      }
      token = createEventToken()
    }

    await this.db
      .prepare(
        'insert into events (id, token, title, currency, created_at, updated_at) values (?, ?, ?, ?, ?, ?)'
      )
      .bind(eventId, token, input.title, input.currency, now, now)
      .run()
    await this.db
      .prepare(
        'insert into participants (id, event_id, display_name, sort_order, created_at) values (?, ?, ?, ?, ?)'
      )
      .bind(participantId, eventId, input.displayName, 1, now)
      .run()

    return this.snapshotByToken(token)
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
    const nextOrder = nextParticipantOrder(stored.participants)
    await this.db
      .prepare(
        'insert into participants (id, event_id, display_name, sort_order, created_at) values (?, ?, ?, ?, ?)'
      )
      .bind(crypto.randomUUID(), stored.event.id, displayName, nextOrder, new Date().toISOString())
      .run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    requireParticipant(stored.participants, participantId)
    await this.db
      .prepare('update participants set display_name = ? where event_id = ? and id = ?')
      .bind(displayName, stored.event.id, participantId)
      .run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    requireParticipant(stored.participants, participantId)
    if (isParticipantReferenced(stored, participantId)) {
      throw new StoreError('Referenced Participants cannot be deleted')
    }
    await this.db.prepare('delete from participants where event_id = ? and id = ?').bind(stored.event.id, participantId).run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    assertValidExpense(input, stored.participants)
    const expenseId = crypto.randomUUID()
    const now = new Date().toISOString()
    await this.db
      .prepare(
        'insert into expenses (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(expenseId, stored.event.id, input.description, input.amountMinor, input.payerParticipantId, now, now)
      .run()
    await this.replaceShares(expenseId, input.shares)
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    assertValidExpense(input, stored.participants)
    requireExpense(stored.expenses, expenseId)
    await this.db
      .prepare(
        'update expenses set description = ?, amount_minor = ?, payer_participant_id = ?, updated_at = ? where event_id = ? and id = ?'
      )
      .bind(input.description, input.amountMinor, input.payerParticipantId, new Date().toISOString(), stored.event.id, expenseId)
      .run()
    await this.replaceShares(expenseId, input.shares)
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    requireExpense(stored.expenses, expenseId)
    await this.db.prepare('delete from shares where expense_id = ?').bind(expenseId).run()
    await this.db.prepare('delete from expenses where event_id = ? and id = ?').bind(stored.event.id, expenseId).run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    assertValidSettlementPayment(input, stored.participants)
    const now = new Date().toISOString()
    await this.db
      .prepare(
        'insert into settlement_payments (id, event_id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        crypto.randomUUID(),
        stored.event.id,
        input.senderParticipantId,
        input.recipientParticipantId,
        input.amountMinor,
        now,
        now
      )
      .run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async updateSettlementPayment(
    token: string,
    settlementPaymentId: string,
    input: SettlementPaymentInput
  ): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    assertValidSettlementPayment(input, stored.participants)
    requireSettlementPayment(stored.settlementPayments, settlementPaymentId)
    await this.db
      .prepare(
        'update settlement_payments set sender_participant_id = ?, recipient_participant_id = ?, amount_minor = ?, updated_at = ? where event_id = ? and id = ?'
      )
      .bind(
        input.senderParticipantId,
        input.recipientParticipantId,
        input.amountMinor,
        new Date().toISOString(),
        stored.event.id,
        settlementPaymentId
      )
      .run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  async deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    requireSettlementPayment(stored.settlementPayments, settlementPaymentId)
    await this.db
      .prepare('delete from settlement_payments where event_id = ? and id = ?')
      .bind(stored.event.id, settlementPaymentId)
      .run()
    await this.touchEvent(stored.event.id)
    return this.snapshotByToken(token)
  }

  private async replaceShares(expenseId: string, shares: Share[]): Promise<void> {
    await this.db.prepare('delete from shares where expense_id = ?').bind(expenseId).run()
    for (const share of shares) {
      await this.db
        .prepare('insert into shares (id, expense_id, participant_id, amount_minor) values (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), expenseId, share.participantId, share.amountMinor)
        .run()
    }
  }

  private async snapshotByToken(token: string): Promise<EventSnapshot> {
    return withDerived(await this.rawSnapshot(token))
  }

  private async rawSnapshot(token: string): Promise<StoredEvent> {
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

  private async touchEvent(eventId: string): Promise<void> {
    await this.db.prepare('update events set updated_at = ? where id = ?').bind(new Date().toISOString(), eventId).run()
  }
}

interface StoredEvent {
  event: EventSummary
  participants: Participant[]
  expenses: Expense[]
  settlementPayments: SettlementPayment[]
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

function isParticipantReferenced(stored: StoredEvent, participantId: string): boolean {
  return (
    stored.expenses.some(
      (expense) =>
        expense.payerParticipantId === participantId ||
        expense.shares.some((share) => share.participantId === participantId)
    ) ||
    stored.settlementPayments.some(
      (payment) =>
        payment.senderParticipantId === participantId || payment.recipientParticipantId === participantId
    )
  )
}

function cloneStoredEvent(stored: StoredEvent): StoredEvent {
  return {
    event: { ...stored.event },
    participants: stored.participants.map((participant) => ({ ...participant })),
    expenses: stored.expenses.map((expense) => ({
      ...expense,
      shares: cloneShares(expense.shares)
    })),
    settlementPayments: stored.settlementPayments.map((payment) => ({ ...payment }))
  }
}

function cloneShares(shares: Share[]): Share[] {
  return shares.map((share) => ({ ...share }))
}

function nextParticipantOrder(participants: Participant[]): number {
  return Math.max(0, ...participants.map((participant) => participant.order)) + 1
}

function touch(event: EventSummary): void {
  event.updatedAt = new Date().toISOString()
}
