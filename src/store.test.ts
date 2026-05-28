import { readdir } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import type { Miniflare } from 'miniflare'
import { createMigratedD1Store } from '../test/d1-store'
import type { EventSnapshot, ExpenseInput, Participant, SettlementPayment } from './domain'
import { D1Store } from './store'

const miniflareInstances: Miniflare[] = []

afterEach(async () => {
  await Promise.all(miniflareInstances.splice(0).map((miniflare) => miniflare.dispose()))
})

describe('D1Store with migrations', () => {
  it('applies every checked-in migration to a fresh D1 database', async () => {
    const { store, migrationFiles } = await createD1Store()
    const checkedInMigrationFiles = await readdir(new URL('../migrations/', import.meta.url))

    expect(migrationFiles).toEqual(checkedInMigrationFiles.filter((file) => file.endsWith('.sql')).sort())

    const created = await store.createEvent({
      title: 'Melbourne lunch',
      currency: 'AUD',
      displayName: 'Mia'
    })

    const persisted = await requireSnapshot(store, created.event.token)
    expect(persisted.event.title).toBe('Melbourne lunch')
    expect(persisted.participants).toEqual([
      expect.objectContaining({
        displayName: 'Mia'
      })
    ])
  })

  it('persists Participants, Expenses, Settlement Payments, Balances, and Suggested Settlements', async () => {
    const { store } = await createD1Store()
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

  it('round trips Event Records through a fresh D1Store instance', async () => {
    const { store, db } = await createD1Store()
    const created = await store.createEvent({
      title: 'Road trip',
      currency: 'NZD',
      displayName: 'Sarah'
    })
    const token = created.event.token
    const sarah = created.participants[0]
    const withAlex = await store.addParticipant(token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')
    await store.createExpense(token, dinnerInput(sarah.id, alex.id))
    await store.createSettlementPayment(token, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amountMinor: 2000
    })

    const reopened = new D1Store(db)
    const persisted = await requireSnapshot(reopened, token)

    expect(persisted.event).toEqual(expect.objectContaining({
      title: 'Road trip',
      currency: 'NZD',
      eventLinkPath: `/e/${token}`
    }))
    expect(persisted.participants.map((participant) => participant.displayName)).toEqual(['Sarah', 'Alex'])
    expect(persisted.expenses).toEqual([
      expect.objectContaining({
        description: 'Dinner',
        amountMinor: 8000,
        payerParticipantId: sarah.id,
        shares: expect.arrayContaining([
          { participantId: sarah.id, amountMinor: 3000 },
          { participantId: alex.id, amountMinor: 5000 }
        ])
      })
    ])
    expect(persisted.expenses[0]?.shares).toHaveLength(2)
    expect(persisted.settlementPayments).toEqual([
      expect.objectContaining({
        senderParticipantId: alex.id,
        recipientParticipantId: sarah.id,
        amountMinor: 2000
      })
    ])
    expect(persisted.balances).toEqual([
      { participantId: sarah.id, amountMinor: 3000 },
      { participantId: alex.id, amountMinor: -3000 }
    ])
    expect(persisted.suggestedSettlements).toEqual([
      { senderParticipantId: alex.id, recipientParticipantId: sarah.id, amountMinor: 3000 }
    ])
  })

  it('updates and deletes Expenses and Settlement Payments through D1', async () => {
    const { store } = await createD1Store()
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
    const { store } = await createD1Store()
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

  it.each(rollbackCases())('rolls back %s when D1 rejects the final Event touch', async (_name, exercise) => {
    await exercise()
  })
})

type RollbackCase = readonly [string, () => Promise<void>]

function rollbackCases(): RollbackCase[] {
  return [
    ['adding a Participant', async () => {
      const { store, db } = await createD1Store()
      const created = await store.createEvent({
        title: 'Rollback lunch',
        currency: 'AUD',
        displayName: 'Sarah'
      })

      await rejectEventTouches(db)
      await expect(store.addParticipant(created.event.token, 'Alex')).rejects.toThrow()

      const persisted = await requireSnapshot(store, created.event.token)
      expect(persisted.participants.map((participant) => participant.displayName)).toEqual(['Sarah'])
    }],
    ['renaming a Participant', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah } = await createTwoParticipantEvent(store)

      await rejectEventTouches(db)
      await expect(store.renameParticipant(token, sarah.id, 'Sam')).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.participants.map((participant) => participant.displayName)).toEqual(['Sarah', 'Alex'])
    }],
    ['deleting a Participant', async () => {
      const { store, db } = await createD1Store()
      const { token } = await createTwoParticipantEvent(store)
      const alex = requireParticipant(await requireSnapshot(store, token), 'Alex')

      await rejectEventTouches(db)
      await expect(store.deleteParticipant(token, alex.id)).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.participants.map((participant) => participant.displayName)).toEqual(['Sarah', 'Alex'])
    }],
    ['creating an Expense', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah, alex } = await createTwoParticipantEvent(store)

      await rejectEventTouches(db)
      await expect(store.createExpense(token, dinnerInput(sarah.id, alex.id))).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.expenses).toEqual([])
    }],
    ['updating an Expense', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah, alex } = await createTwoParticipantEvent(store)
      const withExpense = await store.createExpense(token, dinnerInput(sarah.id, alex.id))
      const expense = withExpense.expenses[0]

      await rejectEventTouches(db)
      await expect(
        store.updateExpense(token, expense.id, {
          description: 'Groceries',
          amountMinor: 9000,
          payerParticipantId: alex.id,
          shares: [
            { participantId: sarah.id, amountMinor: 4500 },
            { participantId: alex.id, amountMinor: 4500 }
          ]
        })
      ).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.expenses).toEqual([
        expect.objectContaining({
          id: expense.id,
          description: 'Dinner',
          amountMinor: 8000,
          payerParticipantId: sarah.id,
          shares: expect.arrayContaining([
            { participantId: sarah.id, amountMinor: 3000 },
            { participantId: alex.id, amountMinor: 5000 }
          ])
        })
      ])
      expect(persisted.expenses[0]?.shares).toHaveLength(2)
    }],
    ['deleting an Expense', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah, alex } = await createTwoParticipantEvent(store)
      const withExpense = await store.createExpense(token, dinnerInput(sarah.id, alex.id))
      const expense = withExpense.expenses[0]

      await rejectEventTouches(db)
      await expect(store.deleteExpense(token, expense.id)).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.expenses).toEqual([
        expect.objectContaining({
          id: expense.id,
          description: 'Dinner'
        })
      ])
    }],
    ['creating a Settlement Payment', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah, alex } = await createTwoParticipantEvent(store)

      await rejectEventTouches(db)
      await expect(
        store.createSettlementPayment(token, {
          senderParticipantId: alex.id,
          recipientParticipantId: sarah.id,
          amountMinor: 2000
        })
      ).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.settlementPayments).toEqual([])
    }],
    ['updating a Settlement Payment', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah, alex } = await createTwoParticipantEvent(store)
      const payment = await createSettlementPayment(store, token, sarah, alex)

      await rejectEventTouches(db)
      await expect(
        store.updateSettlementPayment(token, payment.id, {
          senderParticipantId: sarah.id,
          recipientParticipantId: alex.id,
          amountMinor: 1000
        })
      ).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.settlementPayments).toEqual([
        expect.objectContaining({
          id: payment.id,
          senderParticipantId: alex.id,
          recipientParticipantId: sarah.id,
          amountMinor: 2000
        })
      ])
    }],
    ['deleting a Settlement Payment', async () => {
      const { store, db } = await createD1Store()
      const { token, sarah, alex } = await createTwoParticipantEvent(store)
      const payment = await createSettlementPayment(store, token, sarah, alex)

      await rejectEventTouches(db)
      await expect(store.deleteSettlementPayment(token, payment.id)).rejects.toThrow()

      const persisted = await requireSnapshot(store, token)
      expect(persisted.settlementPayments).toEqual([
        expect.objectContaining({
          id: payment.id,
          amountMinor: 2000
        })
      ])
    }]
  ]
}

async function createD1Store(): Promise<{ store: D1Store; db: D1Database; migrationFiles: string[] }> {
  const { store, db, miniflare, migrationFiles } = await createMigratedD1Store()
  miniflareInstances.push(miniflare)
  return { store, db, migrationFiles }
}

async function rejectEventTouches(db: D1Database): Promise<void> {
  await db.prepare(`
    create trigger reject_event_touch
    before update on events
    begin
      select raise(abort, 'simulated event touch failure');
    end
  `).run()
}

async function createTwoParticipantEvent(
  store: D1Store
): Promise<{ token: string; sarah: Participant; alex: Participant }> {
  const created = await store.createEvent({
    title: 'Sydney weekend',
    currency: 'AUD',
    displayName: 'Sarah'
  })
  const token = created.event.token
  const sarah = created.participants[0]
  const withAlex = await store.addParticipant(token, 'Alex')
  const alex = requireParticipant(withAlex, 'Alex')
  return { token, sarah, alex }
}

async function createSettlementPayment(
  store: D1Store,
  token: string,
  sarah: Participant,
  alex: Participant
): Promise<SettlementPayment> {
  const withPayment = await store.createSettlementPayment(token, {
    senderParticipantId: alex.id,
    recipientParticipantId: sarah.id,
    amountMinor: 2000
  })
  return withPayment.settlementPayments[0]
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
