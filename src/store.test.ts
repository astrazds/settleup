import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EventSnapshot, ExpenseInput } from './domain'
import { D1Store } from './store'
import type { D1DatabaseLike, D1PreparedStatementLike } from './store'

describe('D1Store atomic mutations', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rolls back Event creation when the first Participant cannot be saved', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const db = new FakeD1Database()
    const store = new D1Store(db)
    db.failNextQueryContaining('insert into participants')

    await expect(store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })).rejects.toThrow('Injected D1 failure')

    await expect(store.getEventByToken('aaaaaaaaaaaaaaaaaa')).resolves.toBeNull()
  })

  it('rolls back Expense creation when a Share cannot be saved', async () => {
    const db = new FakeD1Database()
    const store = new D1Store(db)
    const snapshot = await createTwoParticipantEvent(store)
    const [sarah, alex] = snapshot.participants
    db.failNextQueryContaining('insert into shares')

    await expect(store.createExpense(snapshot.event.token, {
      description: 'Dinner',
      amountMinor: 8000,
      payerParticipantId: sarah.id,
      shares: [
        { participantId: sarah.id, amountMinor: 3000 },
        { participantId: alex.id, amountMinor: 5000 }
      ]
    })).rejects.toThrow('Injected D1 failure')

    const afterFailure = await requireSnapshot(store, snapshot.event.token)
    expect(afterFailure.expenses).toEqual([])
    expect(afterFailure.balances).toEqual([
      { participantId: sarah.id, amountMinor: 0 },
      { participantId: alex.id, amountMinor: 0 }
    ])
  })

  it('rolls back Expense updates when replacement Shares cannot be saved', async () => {
    const db = new FakeD1Database()
    const store = new D1Store(db)
    const snapshot = await createTwoParticipantEvent(store)
    const [sarah, alex] = snapshot.participants
    const withExpense = await store.createExpense(snapshot.event.token, dinnerInput(sarah.id, alex.id))
    const originalExpense = withExpense.expenses[0]
    db.failNextQueryContaining('insert into shares')

    await expect(store.updateExpense(snapshot.event.token, originalExpense.id, {
      description: 'Groceries',
      amountMinor: 9000,
      payerParticipantId: alex.id,
      shares: [
        { participantId: sarah.id, amountMinor: 4500 },
        { participantId: alex.id, amountMinor: 4500 }
      ]
    })).rejects.toThrow('Injected D1 failure')

    const afterFailure = await requireSnapshot(store, snapshot.event.token)
    expect(afterFailure.expenses).toHaveLength(1)
    expect(afterFailure.expenses[0]).toEqual(expect.objectContaining({
      id: originalExpense.id,
      description: 'Dinner',
      amountMinor: 8000,
      payerParticipantId: sarah.id
    }))
    expect(afterFailure.expenses[0].shares).toHaveLength(2)
    expect(afterFailure.expenses[0].shares).toEqual(expect.arrayContaining([
      { participantId: sarah.id, amountMinor: 3000 },
      { participantId: alex.id, amountMinor: 5000 }
    ]))
  })

  it('rolls back Expense deletion when the Expense row cannot be deleted', async () => {
    const db = new FakeD1Database()
    const store = new D1Store(db)
    const snapshot = await createTwoParticipantEvent(store)
    const [sarah, alex] = snapshot.participants
    const withExpense = await store.createExpense(snapshot.event.token, dinnerInput(sarah.id, alex.id))
    const originalExpense = withExpense.expenses[0]
    db.failNextQueryContaining('delete from expenses')

    await expect(store.deleteExpense(snapshot.event.token, originalExpense.id)).rejects.toThrow('Injected D1 failure')

    const afterFailure = await requireSnapshot(store, snapshot.event.token)
    expect(afterFailure.expenses).toHaveLength(1)
    expect(afterFailure.expenses[0]).toEqual(expect.objectContaining({
      id: originalExpense.id,
      description: 'Dinner'
    }))
    expect(afterFailure.expenses[0].shares).toHaveLength(2)
    expect(afterFailure.expenses[0].shares).toEqual(expect.arrayContaining([
      { participantId: sarah.id, amountMinor: 3000 },
      { participantId: alex.id, amountMinor: 5000 }
    ]))
  })

  it('rolls back Settlement Payment creation when the Event touch cannot be saved', async () => {
    const db = new FakeD1Database()
    const store = new D1Store(db)
    const snapshot = await createTwoParticipantEvent(store)
    const [sarah, alex] = snapshot.participants
    const withExpense = await store.createExpense(snapshot.event.token, dinnerInput(sarah.id, alex.id))
    db.failNextQueryContaining('update events set updated_at')

    await expect(store.createSettlementPayment(snapshot.event.token, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amountMinor: 5000
    })).rejects.toThrow('Injected D1 failure')

    const afterFailure = await requireSnapshot(store, snapshot.event.token)
    expect(afterFailure.settlementPayments).toEqual([])
    expect(afterFailure.balances).toEqual(withExpense.balances)
  })
})

async function createTwoParticipantEvent(store: D1Store): Promise<EventSnapshot> {
  const created = await store.createEvent({
    title: 'Sydney weekend',
    currency: 'AUD',
    displayName: 'Sarah'
  })
  return store.addParticipant(created.event.token, 'Alex')
}

function dinnerInput(sarahId: string, alexId: string): ExpenseInput {
  return {
    description: 'Dinner',
    amountMinor: 8000,
    payerParticipantId: sarahId,
    shares: [
      { participantId: sarahId, amountMinor: 3000 },
      { participantId: alexId, amountMinor: 5000 }
    ]
  }
}

async function requireSnapshot(store: D1Store, token: string): Promise<EventSnapshot> {
  const snapshot = await store.getEventByToken(token)
  if (!snapshot) {
    throw new Error(`Expected Event ${token}`)
  }
  return snapshot
}

interface FakeEventRow {
  id: string
  token: string
  title: string
  currency: string
  created_at: string
  updated_at: string
}

interface FakeParticipantRow {
  id: string
  event_id: string
  display_name: string
  sort_order: number
  created_at: string
}

interface FakeExpenseRow {
  id: string
  event_id: string
  description: string
  amount_minor: number
  payer_participant_id: string
  created_at: string
  updated_at: string
}

interface FakeShareRow {
  id: string
  expense_id: string
  participant_id: string
  amount_minor: number
}

interface FakeSettlementPaymentRow {
  id: string
  event_id: string
  sender_participant_id: string
  recipient_participant_id: string
  amount_minor: number
  created_at: string
  updated_at: string
}

interface FakeD1State {
  events: FakeEventRow[]
  participants: FakeParticipantRow[]
  expenses: FakeExpenseRow[]
  shares: FakeShareRow[]
  settlementPayments: FakeSettlementPaymentRow[]
}

class FakeD1Database implements D1DatabaseLike {
  private state: FakeD1State = {
    events: [],
    participants: [],
    expenses: [],
    shares: [],
    settlementPayments: []
  }

  private failQuery: string | null = null

  prepare(query: string): D1PreparedStatementLike {
    return new FakeD1PreparedStatement(this, query)
  }

  async batch(statements: D1PreparedStatementLike[]): Promise<unknown[]> {
    const snapshot = cloneState(this.state)
    const results: unknown[] = []
    try {
      for (const statement of statements) {
        if (!(statement instanceof FakeD1PreparedStatement)) {
          throw new Error('FakeD1Database can only batch its own prepared statements')
        }
        results.push(await statement.run())
      }
    } catch (error) {
      this.state = snapshot
      throw error
    }
    return results
  }

  failNextQueryContaining(query: string): void {
    this.failQuery = normalizeQuery(query)
  }

  async first<T>(query: string, values: unknown[]): Promise<T | null> {
    const rows = await this.all<T>(query, values)
    return rows.results?.[0] ?? null
  }

  async all<T>(query: string, values: unknown[]): Promise<{ results?: T[] }> {
    const normalized = normalizeQuery(query)
    if (normalized === 'select id from events where token = ?') {
      return rows<T>(this.state.events.filter((event) => event.token === stringValue(values[0])).map((event) => ({ id: event.id })))
    }
    if (normalized === 'select id, token, title, currency, created_at, updated_at from events where token = ?') {
      return rows<T>(this.state.events.filter((event) => event.token === stringValue(values[0])))
    }
    if (normalized === 'select id, display_name, sort_order, created_at from participants where event_id = ? order by sort_order asc') {
      return rows<T>(this.state.participants
        .filter((participant) => participant.event_id === stringValue(values[0]))
        .sort((left, right) => left.sort_order - right.sort_order)
        .map(({ id, display_name, sort_order, created_at }) => ({ id, display_name, sort_order, created_at })))
    }
    if (normalized === 'select id, description, amount_minor, payer_participant_id, created_at, updated_at from expenses where event_id = ? order by created_at desc') {
      return rows<T>(this.state.expenses
        .filter((expense) => expense.event_id === stringValue(values[0]))
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .map(({ id, description, amount_minor, payer_participant_id, created_at, updated_at }) => ({
          id,
          description,
          amount_minor,
          payer_participant_id,
          created_at,
          updated_at
        })))
    }
    if (normalized === 'select participant_id, amount_minor from shares where expense_id = ? order by id asc') {
      return rows<T>(this.state.shares
        .filter((share) => share.expense_id === stringValue(values[0]))
        .sort((left, right) => left.id.localeCompare(right.id))
        .map(({ participant_id, amount_minor }) => ({ participant_id, amount_minor })))
    }
    if (normalized === 'select id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at from settlement_payments where event_id = ? order by created_at desc') {
      return rows<T>(this.state.settlementPayments
        .filter((payment) => payment.event_id === stringValue(values[0]))
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .map(({ id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at }) => ({
          id,
          sender_participant_id,
          recipient_participant_id,
          amount_minor,
          created_at,
          updated_at
        })))
    }
    throw new Error(`Unhandled fake D1 query: ${query}`)
  }

  async run(query: string, values: unknown[]): Promise<unknown> {
    const normalized = normalizeQuery(query)
    if (this.failQuery && normalized.includes(this.failQuery)) {
      this.failQuery = null
      throw new Error(`Injected D1 failure for ${normalized}`)
    }

    if (normalized === 'insert into events (id, token, title, currency, created_at, updated_at) values (?, ?, ?, ?, ?, ?)') {
      this.state.events.push({
        id: stringValue(values[0]),
        token: stringValue(values[1]),
        title: stringValue(values[2]),
        currency: stringValue(values[3]),
        created_at: stringValue(values[4]),
        updated_at: stringValue(values[5])
      })
      return {}
    }
    if (normalized === 'insert into participants (id, event_id, display_name, sort_order, created_at) values (?, ?, ?, ?, ?)') {
      this.state.participants.push({
        id: stringValue(values[0]),
        event_id: stringValue(values[1]),
        display_name: stringValue(values[2]),
        sort_order: numberValue(values[3]),
        created_at: stringValue(values[4])
      })
      return {}
    }
    if (normalized === 'insert into expenses (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)') {
      this.state.expenses.push({
        id: stringValue(values[0]),
        event_id: stringValue(values[1]),
        description: stringValue(values[2]),
        amount_minor: numberValue(values[3]),
        payer_participant_id: stringValue(values[4]),
        created_at: stringValue(values[5]),
        updated_at: stringValue(values[6])
      })
      return {}
    }
    if (normalized === 'update expenses set description = ?, amount_minor = ?, payer_participant_id = ?, updated_at = ? where event_id = ? and id = ?') {
      const expense = this.state.expenses.find(
        (candidate) => candidate.event_id === stringValue(values[4]) && candidate.id === stringValue(values[5])
      )
      if (expense) {
        expense.description = stringValue(values[0])
        expense.amount_minor = numberValue(values[1])
        expense.payer_participant_id = stringValue(values[2])
        expense.updated_at = stringValue(values[3])
      }
      return {}
    }
    if (normalized === 'delete from shares where expense_id = ?') {
      this.state.shares = this.state.shares.filter((share) => share.expense_id !== stringValue(values[0]))
      return {}
    }
    if (normalized === 'insert into shares (id, expense_id, participant_id, amount_minor) values (?, ?, ?, ?)') {
      this.state.shares.push({
        id: stringValue(values[0]),
        expense_id: stringValue(values[1]),
        participant_id: stringValue(values[2]),
        amount_minor: numberValue(values[3])
      })
      return {}
    }
    if (normalized === 'delete from expenses where event_id = ? and id = ?') {
      this.state.expenses = this.state.expenses.filter(
        (expense) => expense.event_id !== stringValue(values[0]) || expense.id !== stringValue(values[1])
      )
      return {}
    }
    if (normalized === 'insert into settlement_payments (id, event_id, sender_participant_id, recipient_participant_id, amount_minor, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)') {
      this.state.settlementPayments.push({
        id: stringValue(values[0]),
        event_id: stringValue(values[1]),
        sender_participant_id: stringValue(values[2]),
        recipient_participant_id: stringValue(values[3]),
        amount_minor: numberValue(values[4]),
        created_at: stringValue(values[5]),
        updated_at: stringValue(values[6])
      })
      return {}
    }
    if (normalized === 'update events set updated_at = ? where id = ?') {
      const event = this.state.events.find((candidate) => candidate.id === stringValue(values[1]))
      if (event) {
        event.updated_at = stringValue(values[0])
      }
      return {}
    }
    throw new Error(`Unhandled fake D1 run: ${query}`)
  }
}

class FakeD1PreparedStatement implements D1PreparedStatementLike {
  private values: unknown[] = []

  constructor(
    private readonly db: FakeD1Database,
    private readonly query: string
  ) {}

  bind(...values: unknown[]): D1PreparedStatementLike {
    this.values = values
    return this
  }

  first<T = unknown>(): Promise<T | null> {
    return this.db.first<T>(this.query, this.values)
  }

  all<T = unknown>(): Promise<{ results?: T[] }> {
    return this.db.all<T>(this.query, this.values)
  }

  run(): Promise<unknown> {
    return this.db.run(this.query, this.values)
  }
}

function rows<T>(results: unknown[]): { results: T[] } {
  return { results: results as T[] }
}

function stringValue(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string value, got ${typeof value}`)
  }
  return value
}

function numberValue(value: unknown): number {
  if (typeof value !== 'number') {
    throw new Error(`Expected number value, got ${typeof value}`)
  }
  return value
}

function cloneState(state: FakeD1State): FakeD1State {
  return {
    events: state.events.map((event) => ({ ...event })),
    participants: state.participants.map((participant) => ({ ...participant })),
    expenses: state.expenses.map((expense) => ({ ...expense })),
    shares: state.shares.map((share) => ({ ...share })),
    settlementPayments: state.settlementPayments.map((payment) => ({ ...payment }))
  }
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim()
}
