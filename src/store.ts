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
import {
  eventCleanupCutoff,
  isEventExpired
} from './event-retention'
import { SqliteEventRecordPersistence } from './sqlite-event-record-persistence'
import type { SqlDatabaseLike } from './sqlite-event-record-persistence'
import type { EventSnapshot, ExpenseInput, SettlementPaymentInput } from './domain'
import { StoreError } from './errors'

export { StoreError } from './errors'
export type { SqlDatabaseLike, SqlPreparedStatementLike } from './sqlite-event-record-persistence'

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
  cleanupExpiredEvents(now?: Date): Promise<void>
}

export class MemoryStore implements AppStore {
  private readonly events = new Map<string, EventRecord>()

  constructor(private readonly now = () => new Date()) {}

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    const now = this.now().toISOString()
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
    return stored && !isEventExpired(stored.event.createdAt, this.now()) ? eventSnapshot(stored) : null
  }

  async addParticipant(token: string, displayName: string): Promise<EventSnapshot> {
    const next = addParticipantToEvent(this.requireEvent(token), displayName, {
      participantId: crypto.randomUUID(),
      now: this.now().toISOString()
    })
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot> {
    const next = renameParticipantInEvent(this.requireEvent(token), participantId, displayName, this.now().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
    const next = deleteParticipantFromEvent(this.requireEvent(token), participantId, this.now().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot> {
    const next = createExpenseInEvent(this.requireEvent(token), input, {
      expenseId: crypto.randomUUID(),
      now: this.now().toISOString()
    })
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot> {
    const next = updateExpenseInEvent(this.requireEvent(token), expenseId, input, this.now().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
    const next = deleteExpenseFromEvent(this.requireEvent(token), expenseId, this.now().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot> {
    const next = createSettlementPaymentInEvent(this.requireEvent(token), input, {
      settlementPaymentId: crypto.randomUUID(),
      now: this.now().toISOString()
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
      this.now().toISOString()
    )
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot> {
    const next = deleteSettlementPaymentFromEvent(this.requireEvent(token), settlementPaymentId, this.now().toISOString())
    this.events.set(token, next)
    return eventSnapshot(next)
  }

  async cleanupExpiredEvents(now = this.now()): Promise<void> {
    const cutoff = eventCleanupCutoff(now)
    for (const [token, record] of this.events.entries()) {
      if (record.event.createdAt <= cutoff) {
        this.events.delete(token)
      }
    }
  }

  private requireEvent(token: string): EventRecord {
    const stored = this.events.get(token)
    if (!stored || isEventExpired(stored.event.createdAt, this.now())) {
      throw new StoreError('Event not found', 404)
    }
    return cloneEventRecord(stored)
  }
}

export class SqliteStore implements AppStore {
  private readonly records: SqliteEventRecordPersistence

  constructor(db: SqlDatabaseLike, private readonly now = () => new Date()) {
    this.records = new SqliteEventRecordPersistence(db)
  }

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const token = newEventToken()
      const existing = await this.records.findByToken(token)
      if (!existing) {
        const record = createEventRecord(input, {
          eventId: crypto.randomUUID(),
          participantId: crypto.randomUUID(),
          token,
          now: this.now().toISOString()
        })
        await this.records.create(record)
        return this.snapshotByToken(token)
      }
    }

    throw new StoreError('Could not create Event Link', 500)
  }

  async getEventByToken(token: string): Promise<EventSnapshot | null> {
    const record = await this.records.findByToken(token)
    if (!record || isEventExpired(record.event.createdAt, this.now())) {
      return null
    }
    return eventSnapshot(record)
  }

  async addParticipant(token: string, displayName: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = addParticipantToEvent(stored, displayName, {
      participantId: crypto.randomUUID(),
      now: this.now().toISOString()
    })
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async renameParticipant(token: string, participantId: string, displayName: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = renameParticipantInEvent(stored, participantId, displayName, this.now().toISOString())
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = deleteParticipantFromEvent(stored, participantId, this.now().toISOString())
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async createExpense(token: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = createExpenseInEvent(stored, input, {
      expenseId: crypto.randomUUID(),
      now: this.now().toISOString()
    })
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async updateExpense(token: string, expenseId: string, input: ExpenseInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = updateExpenseInEvent(stored, expenseId, input, this.now().toISOString())
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = deleteExpenseFromEvent(stored, expenseId, this.now().toISOString())
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async createSettlementPayment(token: string, input: SettlementPaymentInput): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = createSettlementPaymentInEvent(stored, input, {
      settlementPaymentId: crypto.randomUUID(),
      now: this.now().toISOString()
    })
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async updateSettlementPayment(
    token: string,
    settlementPaymentId: string,
    input: SettlementPaymentInput
  ): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = updateSettlementPaymentInEvent(stored, settlementPaymentId, input, this.now().toISOString())
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async deleteSettlementPayment(token: string, settlementPaymentId: string): Promise<EventSnapshot> {
    const stored = await this.rawSnapshot(token)
    const next = deleteSettlementPaymentFromEvent(stored, settlementPaymentId, this.now().toISOString())
    await this.records.replace(next)
    return this.snapshotByToken(token)
  }

  async cleanupExpiredEvents(now = this.now()): Promise<void> {
    await this.records.deleteCreatedBefore(eventCleanupCutoff(now))
  }

  private async snapshotByToken(token: string): Promise<EventSnapshot> {
    return eventSnapshot(await this.rawSnapshot(token))
  }

  private async rawSnapshot(token: string): Promise<EventRecord> {
    const record = await this.records.findByToken(token)
    if (!record || isEventExpired(record.event.createdAt, this.now())) {
      throw new StoreError('Event not found', 404)
    }
    return record
  }
}
