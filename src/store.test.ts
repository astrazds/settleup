import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { Miniflare } from 'miniflare'
import type { EventSnapshot, ExpenseInput } from './domain'
import { D1Store } from './store'

const miniflareInstances: Miniflare[] = []

afterEach(async () => {
  await Promise.all(miniflareInstances.splice(0).map((miniflare) => miniflare.dispose()))
})

describe('D1Store with migrations', () => {
  it('persists Participants, Expenses, Settlement Payments, Balances, and Suggested Settlements', async () => {
    const store = await createD1Store()
    const created = await store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })
    const token = created.event.token
    const sarah = created.participants[0]
    const withAlex = await store.addParticipant(token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')

    const withExpense = await store.createExpense(token, dinnerInput(sarah.id, alex.id))
    expect(withExpense.expenses).toEqual([
      expect.objectContaining({
        description: 'Dinner',
        amountMinor: 8000,
        payerParticipantId: sarah.id
      })
    ])
    expect(withExpense.balances).toEqual([
      { participantId: sarah.id, amountMinor: 5000 },
      { participantId: alex.id, amountMinor: -5000 }
    ])
    expect(withExpense.suggestedSettlements).toEqual([
      { senderParticipantId: alex.id, recipientParticipantId: sarah.id, amountMinor: 5000 }
    ])

    const withPayment = await store.createSettlementPayment(token, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amountMinor: 5000
    })
    expect(withPayment.balances).toEqual([
      { participantId: sarah.id, amountMinor: 0 },
      { participantId: alex.id, amountMinor: 0 }
    ])
    expect(withPayment.suggestedSettlements).toEqual([])

    const persisted = await requireSnapshot(store, token)
    expect(persisted.event.title).toBe('Sydney weekend')
    expect(persisted.participants.map((participant) => participant.displayName)).toEqual(['Sarah', 'Alex'])
    expect(persisted.expenses).toHaveLength(1)
    expect(persisted.settlementPayments).toHaveLength(1)
  })

  it('updates and deletes Expenses and Settlement Payments through D1', async () => {
    const store = await createD1Store()
    const created = await store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })
    const token = created.event.token
    const sarah = created.participants[0]
    const withAlex = await store.addParticipant(token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')
    const withExpense = await store.createExpense(token, dinnerInput(sarah.id, alex.id))
    const expense = withExpense.expenses[0]

    const updatedExpense = await store.updateExpense(token, expense.id, {
      description: 'Groceries',
      amountMinor: 9000,
      payerParticipantId: alex.id,
      shares: [
        { participantId: sarah.id, amountMinor: 4500 },
        { participantId: alex.id, amountMinor: 4500 }
      ]
    })
    expect(updatedExpense.expenses).toEqual([
      expect.objectContaining({
        id: expense.id,
        description: 'Groceries',
        amountMinor: 9000,
        payerParticipantId: alex.id
      })
    ])

    const withPayment = await store.createSettlementPayment(token, {
      senderParticipantId: sarah.id,
      recipientParticipantId: alex.id,
      amountMinor: 1000
    })
    const payment = withPayment.settlementPayments[0]
    const updatedPayment = await store.updateSettlementPayment(token, payment.id, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amountMinor: 500
    })
    expect(updatedPayment.settlementPayments).toEqual([
      expect.objectContaining({
        id: payment.id,
        senderParticipantId: alex.id,
        recipientParticipantId: sarah.id,
        amountMinor: 500
      })
    ])

    const withoutPayment = await store.deleteSettlementPayment(token, payment.id)
    expect(withoutPayment.settlementPayments).toEqual([])

    const withoutExpense = await store.deleteExpense(token, expense.id)
    expect(withoutExpense.expenses).toEqual([])
    expect(withoutExpense.balances).toEqual([
      { participantId: sarah.id, amountMinor: 0 },
      { participantId: alex.id, amountMinor: 0 }
    ])
  })

  it('blocks deletion of referenced Participants through the shared Event rule', async () => {
    const store = await createD1Store()
    const created = await store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })
    const token = created.event.token
    const sarah = created.participants[0]
    const withAlex = await store.addParticipant(token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')

    await store.createExpense(token, dinnerInput(sarah.id, alex.id))

    await expect(store.deleteParticipant(token, alex.id)).rejects.toMatchObject({
      message: 'Referenced Participants cannot be deleted',
      status: 400
    })
  })
})

async function createD1Store(): Promise<D1Store> {
  const miniflare = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: {
      DB: 'settleup-test'
    }
  })
  miniflareInstances.push(miniflare)
  const db = await miniflare.getD1Database('DB')
  await applyMigrations(db)
  return new D1Store(db)
}

async function applyMigrations(db: D1Database): Promise<void> {
  const migration = await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8')
  const statements = migration
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)

  for (const statement of statements) {
    await db.prepare(statement).run()
  }
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

function requireParticipant(snapshot: EventSnapshot, displayName: string) {
  const participant = snapshot.participants.find((candidate) => candidate.displayName === displayName)
  if (!participant) {
    throw new Error(`Expected Participant ${displayName}`)
  }
  return participant
}
