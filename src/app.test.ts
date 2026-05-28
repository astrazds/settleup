import { describe, expect, it } from 'vitest'
import { createApp } from './index'
import type { EventSnapshot, Expense, Participant, SettlementPayment } from './domain'
import type { EventRealtimeNotifier } from './event-realtime'
import { MemoryStore } from './store'

function jsonRequest(path: string, body: unknown, method = 'POST'): Request {
  return new Request(`https://settleup.test${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function formRequest(path: string, body: Record<string, string>): Request {
  return new Request(`https://settleup.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  })
}

describe('Event creation and access', () => {
  it('creates an Event with a first Participant and opens it by Event Link', async () => {
    const store = new MemoryStore()
    const app = createApp({ storeFactory: () => store })

    const createResponse = await app.request(jsonRequest('/api/events', {
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    }))

    expect(createResponse.status).toBe(201)
    const created = await responseJson<EventSnapshot>(createResponse)

    expect(created.event.title).toBe('Sydney weekend')
    expect(created.event.currency).toBe('AUD')
    expect(created.event.eventLinkPath).toMatch(/^\/e\/[a-z2-9]+$/)
    expect(created.participants).toEqual([
      expect.objectContaining({ displayName: 'Sarah' })
    ])

    const eventResponse = await app.request(created.event.eventLinkPath)
    expect(eventResponse.status).toBe(200)
    expect(eventResponse.headers.get('x-robots-tag')).toBe('noindex')

    const snapshotResponse = await app.request(`/api/events/${created.event.token}`)
    expect(snapshotResponse.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(snapshotResponse)
    expect(snapshot.event.title).toBe('Sydney weekend')
    expect(snapshot.balances).toEqual([
      expect.objectContaining({ amountMinor: 0 })
    ])
  })

  it('rejects blank Event creation fields', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request(jsonRequest('/api/events', {
      title: ' ',
      currency: 'AUD',
      displayName: ' '
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: expect.stringContaining('Event Title')
      }
    })
  })

  it('rejects unsupported JSON Event creation currencies', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request(jsonRequest('/api/events', {
      title: 'Toronto weekend',
      currency: 'CAD',
      displayName: 'Sarah'
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Currency must be AUD, USD, EUR, GBP, or NZD'
      }
    })
  })

  it('rejects malformed JSON Event creation with the standard validation error shape', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"title":'
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Request body must be JSON'
      }
    })
  })

  it('rejects unsupported HTML Event creation currencies', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request(formRequest('/events', {
      title: 'Toronto weekend',
      currency: 'CAD',
      displayName: 'Sarah'
    }))
    const html = await response.text()

    expect(response.status).toBe(400)
    expect(html).toContain('Currency must be AUD, USD, EUR, GBP, or NZD')
  })
})

describe('Event workflows', () => {
  it('notifies realtime listeners after successful Event mutations', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const app = createApp({
      storeFactory: () => store,
      realtimeNotifierFactory: () => notifier
    })
    const created = await createEvent(app)
    const token = created.event.token

    const response = await app.request(jsonRequest(`/api/events/${token}/participants`, {
      displayName: 'Alex'
    }))

    expect(response.status).toBe(200)
    expect(notifier.changedTokens).toEqual([token])
  })

  it('does not notify realtime listeners when an Event mutation fails validation', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const app = createApp({
      storeFactory: () => store,
      realtimeNotifierFactory: () => notifier
    })
    const created = await createEvent(app)
    const token = created.event.token

    const response = await app.request(jsonRequest(`/api/events/${token}/expenses`, {
      description: 'Dinner',
      amount: '80.00',
      payerParticipantId: created.participants[0].id
    }))

    expect(response.status).toBe(400)
    expect(notifier.changedTokens).toEqual([])
  })

  it('rejects realtime connections unless the request upgrades to WebSocket', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const app = createApp({
      storeFactory: () => store,
      realtimeNotifierFactory: () => notifier
    })
    const created = await createEvent(app)

    const response = await app.request(`/api/events/${created.event.token}/realtime`)

    expect(response.status).toBe(426)
    expect(await response.text()).toBe('Expected WebSocket')
    expect(notifier.connectedTokens).toEqual([])
  })

  it('connects existing Events to the realtime notifier', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const app = createApp({
      storeFactory: () => store,
      realtimeNotifierFactory: () => notifier
    })
    const created = await createEvent(app)

    const response = await app.request(`/api/events/${created.event.token}/realtime`, {
      headers: { Upgrade: 'websocket' }
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('connected')
    expect(notifier.connectedTokens).toEqual([created.event.token])
  })

  it('does not connect missing Events to the realtime notifier', async () => {
    const notifier = new FakeRealtimeNotifier()
    const app = createApp({
      storeFactory: () => new MemoryStore(),
      realtimeNotifierFactory: () => notifier
    })

    const response = await app.request('/api/events/missing/realtime', {
      headers: { Upgrade: 'websocket' }
    })

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Event not found')
    expect(notifier.connectedTokens).toEqual([])
  })

  it('manages Participants, Expenses, Balances, Settlement Payments, and Suggested Settlements', async () => {
    const store = new MemoryStore()
    const app = createApp({ storeFactory: () => store })
    const created = await createEvent(app)
    const token = created.event.token
    const sarah = created.participants[0]

    const alexResponse = await app.request(jsonRequest(`/api/events/${token}/participants`, {
      displayName: 'Alex'
    }))
    expect(alexResponse.status).toBe(200)
    const withAlex = await responseJson<EventSnapshot>(alexResponse)
    const alex = requireParticipant(withAlex, 'Alex')

    const expenseResponse = await app.request(jsonRequest(`/api/events/${token}/expenses`, {
      description: 'Dinner',
      amount: '80.00',
      payerParticipantId: sarah.id,
      shares: [
        { participantId: sarah.id, amount: '30.00' },
        { participantId: alex.id, amount: '50.00' }
      ]
    }))
    expect(expenseResponse.status).toBe(200)
    const withExpense = await responseJson<EventSnapshot>(expenseResponse)
    expect(withExpense.expenses).toEqual([
      expect.objectContaining({ description: 'Dinner', amountMinor: 8000 })
    ])
    expect(withExpense.balances).toEqual([
      { participantId: sarah.id, amountMinor: 5000 },
      { participantId: alex.id, amountMinor: -5000 }
    ])
    expect(withExpense.suggestedSettlements).toEqual([
      { senderParticipantId: alex.id, recipientParticipantId: sarah.id, amountMinor: 5000 }
    ])

    const paymentResponse = await app.request(jsonRequest(`/api/events/${token}/settlement-payments`, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amount: '50.00'
    }))
    expect(paymentResponse.status).toBe(200)
    const settled = await responseJson<EventSnapshot>(paymentResponse)
    expect(settled.balances).toEqual([
      { participantId: sarah.id, amountMinor: 0 },
      { participantId: alex.id, amountMinor: 0 }
    ])
    expect(settled.suggestedSettlements).toEqual([])
  })

  it('blocks deletion of referenced Participants', async () => {
    const store = new MemoryStore()
    const app = createApp({ storeFactory: () => store })
    const created = await createEvent(app)
    const token = created.event.token
    const sarah = created.participants[0]

    const alexResponse = await app.request(jsonRequest(`/api/events/${token}/participants`, {
      displayName: 'Alex'
    }))
    const withAlex = await responseJson<EventSnapshot>(alexResponse)
    const alex = requireParticipant(withAlex, 'Alex')

    await app.request(jsonRequest(`/api/events/${token}/expenses`, {
      description: 'Fuel',
      amount: '20.00',
      payerParticipantId: sarah.id,
      shares: [
        { participantId: alex.id, amount: '20.00' }
      ]
    }))

    const deleteResponse = await app.request(`/api/events/${token}/participants/${alex.id}`, {
      method: 'DELETE'
    })

    expect(deleteResponse.status).toBe(400)
    expect(await deleteResponse.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Referenced Participants cannot be deleted'
      }
    })
  })

  it('rejects Expense commands without Shares using the route validation error shape', async () => {
    const store = new MemoryStore()
    const app = createApp({ storeFactory: () => store })
    const created = await createEvent(app)
    const token = created.event.token
    const sarah = created.participants[0]

    const response = await app.request(jsonRequest(`/api/events/${token}/expenses`, {
      description: 'Dinner',
      amount: '80.00',
      payerParticipantId: sarah.id
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Shares are required'
      }
    })
  })

  it('rejects Settlement Payment commands with invalid amounts using the route validation error shape', async () => {
    const store = new MemoryStore()
    const app = createApp({ storeFactory: () => store })
    const created = await createEvent(app)
    const token = created.event.token
    const sarah = created.participants[0]

    const alexResponse = await app.request(jsonRequest(`/api/events/${token}/participants`, {
      displayName: 'Alex'
    }))
    const withAlex = await responseJson<EventSnapshot>(alexResponse)
    const alex = requireParticipant(withAlex, 'Alex')

    const response = await app.request(jsonRequest(`/api/events/${token}/settlement-payments`, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amount: '10/3'
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Amount must be a positive decimal amount'
      }
    })
  })
})

describe('Participant mutation route contracts', () => {
  it('renames a Participant, returns the updated Event Snapshot, and notifies realtime listeners once', async () => {
    const { app, notifier } = testApp()
    const created = await createEvent(app)
    const token = created.event.token
    const withAlex = await addParticipant(app, token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')
    notifier.reset()

    const response = await app.request(jsonRequest(`/api/events/${token}/participants/${alex.id}`, {
      displayName: 'Alex Lee'
    }, 'PATCH'))

    expect(response.status).toBe(200)
    const renamed = await responseJson<EventSnapshot>(response)
    expect(requireParticipant(renamed, 'Alex Lee')).toEqual(expect.objectContaining({
      id: alex.id,
      order: alex.order
    }))
    expect(notifier.changedTokens).toEqual([token])
  })

  it('deletes an unreferenced Participant, returns the updated Event Snapshot, and notifies realtime listeners once', async () => {
    const { app, notifier } = testApp()
    const created = await createEvent(app)
    const token = created.event.token
    const withAlex = await addParticipant(app, token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')
    notifier.reset()

    const response = await app.request(`/api/events/${token}/participants/${alex.id}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(response)
    expect(snapshot.participants.map((participant) => participant.id)).not.toContain(alex.id)
    expect(snapshot.balances).toEqual([
      { participantId: created.participants[0].id, amountMinor: 0 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([])
    expect(notifier.changedTokens).toEqual([token])
  })

  it('returns validation errors for referenced Participant deletion and does not notify realtime listeners', async () => {
    const { app, notifier } = testApp()
    const created = await createEvent(app)
    const token = created.event.token
    const sarah = created.participants[0]
    const withAlex = await addParticipant(app, token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')
    await createExpense(app, token, {
      description: 'Fuel',
      amount: '20.00',
      payerParticipantId: sarah.id,
      shares: [
        { participantId: alex.id, amount: '20.00' }
      ]
    })
    notifier.reset()

    const response = await app.request(`/api/events/${token}/participants/${alex.id}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Referenced Participants cannot be deleted'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })

  it('returns not-found errors for missing Participant mutations and does not notify realtime listeners', async () => {
    const { app, notifier } = testApp()
    const created = await createEvent(app)
    const token = created.event.token
    notifier.reset()

    const renameResponse = await app.request(jsonRequest(`/api/events/${token}/participants/missing-participant`, {
      displayName: 'Alex Lee'
    }, 'PATCH'))
    const deleteResponse = await app.request(`/api/events/${token}/participants/missing-participant`, {
      method: 'DELETE'
    })

    expect(renameResponse.status).toBe(404)
    expect(await renameResponse.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Participant not found'
      }
    })
    expect(deleteResponse.status).toBe(404)
    expect(await deleteResponse.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Participant not found'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })
})

describe('Expense mutation route contracts', () => {
  it('updates an Expense, recomputes derived settlement output, and notifies realtime listeners once', async () => {
    const { app, notifier } = testApp()
    const fixture = await expenseFixture(app)
    notifier.reset()

    const response = await app.request(jsonRequest(`/api/events/${fixture.token}/expenses/${fixture.expense.id}`, {
      description: 'Groceries',
      amount: '60.00',
      payerParticipantId: fixture.sarah.id,
      shares: [
        { participantId: fixture.sarah.id, amount: '10.00' },
        { participantId: fixture.alex.id, amount: '50.00' }
      ]
    }, 'PATCH'))

    expect(response.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(response)
    expect(requireExpense(snapshot, fixture.expense.id)).toEqual(expect.objectContaining({
      description: 'Groceries',
      amountMinor: 6000,
      payerParticipantId: fixture.sarah.id,
      shares: [
        { participantId: fixture.sarah.id, amountMinor: 1000 },
        { participantId: fixture.alex.id, amountMinor: 5000 }
      ]
    }))
    expect(snapshot.balances).toEqual([
      { participantId: fixture.sarah.id, amountMinor: 5000 },
      { participantId: fixture.alex.id, amountMinor: -5000 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: fixture.alex.id, recipientParticipantId: fixture.sarah.id, amountMinor: 5000 }
    ])
    expect(notifier.changedTokens).toEqual([fixture.token])
  })

  it('deletes an Expense, recomputes derived settlement output, and notifies realtime listeners once', async () => {
    const { app, notifier } = testApp()
    const fixture = await expenseFixture(app)
    notifier.reset()

    const response = await app.request(`/api/events/${fixture.token}/expenses/${fixture.expense.id}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(response)
    expect(snapshot.expenses).toEqual([])
    expect(snapshot.balances).toEqual([
      { participantId: fixture.sarah.id, amountMinor: 0 },
      { participantId: fixture.alex.id, amountMinor: 0 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([])
    expect(notifier.changedTokens).toEqual([fixture.token])
  })

  it('returns validation errors for invalid Expense updates and does not notify realtime listeners', async () => {
    const { app, notifier } = testApp()
    const fixture = await expenseFixture(app)
    notifier.reset()

    const response = await app.request(jsonRequest(`/api/events/${fixture.token}/expenses/${fixture.expense.id}`, {
      description: 'Groceries',
      amount: '60.00',
      payerParticipantId: fixture.sarah.id,
      shares: [
        { participantId: fixture.sarah.id, amount: '15.00' },
        { participantId: fixture.alex.id, amount: '15.00' }
      ]
    }, 'PATCH'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Shares must sum to the Expense amount'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })

  it('returns not-found errors for missing Expense mutations and does not notify realtime listeners', async () => {
    const { app, notifier } = testApp()
    const fixture = await expenseFixture(app)
    notifier.reset()

    const updateResponse = await app.request(jsonRequest(`/api/events/${fixture.token}/expenses/missing-expense`, {
      description: 'Groceries',
      amount: '60.00',
      payerParticipantId: fixture.sarah.id,
      shares: [
        { participantId: fixture.sarah.id, amount: '10.00' },
        { participantId: fixture.alex.id, amount: '50.00' }
      ]
    }, 'PATCH'))
    const deleteResponse = await app.request(`/api/events/${fixture.token}/expenses/missing-expense`, {
      method: 'DELETE'
    })

    expect(updateResponse.status).toBe(404)
    expect(await updateResponse.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Expense not found'
      }
    })
    expect(deleteResponse.status).toBe(404)
    expect(await deleteResponse.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Expense not found'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })
})

describe('Settlement Payment mutation route contracts', () => {
  it('updates a Settlement Payment, recomputes derived settlement output, and notifies realtime listeners once', async () => {
    const { app, notifier } = testApp()
    const fixture = await settlementPaymentFixture(app)
    notifier.reset()

    const response = await app.request(jsonRequest(
      `/api/events/${fixture.token}/settlement-payments/${fixture.settlementPayment.id}`,
      {
        senderParticipantId: fixture.alex.id,
        recipientParticipantId: fixture.sarah.id,
        amount: '25.00'
      },
      'PATCH'
    ))

    expect(response.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(response)
    expect(requireSettlementPayment(snapshot, fixture.settlementPayment.id)).toEqual(expect.objectContaining({
      senderParticipantId: fixture.alex.id,
      recipientParticipantId: fixture.sarah.id,
      amountMinor: 2500
    }))
    expect(snapshot.balances).toEqual([
      { participantId: fixture.sarah.id, amountMinor: 2500 },
      { participantId: fixture.alex.id, amountMinor: -2500 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: fixture.alex.id, recipientParticipantId: fixture.sarah.id, amountMinor: 2500 }
    ])
    expect(notifier.changedTokens).toEqual([fixture.token])
  })

  it('deletes a Settlement Payment, recomputes derived settlement output, and notifies realtime listeners once', async () => {
    const { app, notifier } = testApp()
    const fixture = await settlementPaymentFixture(app)
    notifier.reset()

    const response = await app.request(`/api/events/${fixture.token}/settlement-payments/${fixture.settlementPayment.id}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(response)
    expect(snapshot.settlementPayments).toEqual([])
    expect(snapshot.balances).toEqual([
      { participantId: fixture.sarah.id, amountMinor: 5000 },
      { participantId: fixture.alex.id, amountMinor: -5000 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: fixture.alex.id, recipientParticipantId: fixture.sarah.id, amountMinor: 5000 }
    ])
    expect(notifier.changedTokens).toEqual([fixture.token])
  })

  it('returns validation errors for invalid Settlement Payment updates and does not notify realtime listeners', async () => {
    const { app, notifier } = testApp()
    const fixture = await settlementPaymentFixture(app)
    notifier.reset()

    const response = await app.request(jsonRequest(
      `/api/events/${fixture.token}/settlement-payments/${fixture.settlementPayment.id}`,
      {
        senderParticipantId: fixture.alex.id,
        recipientParticipantId: fixture.alex.id,
        amount: '10.00'
      },
      'PATCH'
    ))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Sender and Recipient must be different Participants'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })

  it('returns not-found errors for missing Settlement Payment mutations and does not notify realtime listeners', async () => {
    const { app, notifier } = testApp()
    const fixture = await settlementPaymentFixture(app)
    notifier.reset()

    const updateResponse = await app.request(jsonRequest(
      `/api/events/${fixture.token}/settlement-payments/missing-payment`,
      {
        senderParticipantId: fixture.alex.id,
        recipientParticipantId: fixture.sarah.id,
        amount: '10.00'
      },
      'PATCH'
    ))
    const deleteResponse = await app.request(`/api/events/${fixture.token}/settlement-payments/missing-payment`, {
      method: 'DELETE'
    })

    expect(updateResponse.status).toBe(404)
    expect(await updateResponse.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Settlement Payment not found'
      }
    })
    expect(deleteResponse.status).toBe(404)
    expect(await deleteResponse.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Settlement Payment not found'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })
})

describe('Frontend design contract', () => {
  it('serves the create flow with the brandkit layout and copy', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request('/')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('Settle the shared cost without turning it into admin.')
    expect(html).toContain('class="brand"')
    expect(html).toContain('class="privacy-note"')
    expect(html).toContain('<input type="text" name="title"')
    expect(html).toContain('<option value="AUD">AUD</option>')
    expect(html).toContain('<option value="NZD">NZD</option>')
  })

  it('serves frontend assets aligned to the documented visual system', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const styles = await (await app.request('/static/styles.css')).text()
    const client = await (await app.request('/static/client.js')).text()

    expect(styles).toContain('--on-ledger')
    expect(styles).toContain('.ledger-row.row-positive')
    expect(styles).toContain('@media (max-width: 820px)')
    expect(client).toContain('Expense defaults')
    expect(client).toContain('data-share-summary')
    expect(client).toContain('Event Link copied')
  })
})

async function createEvent(app: ReturnType<typeof createApp>) {
  const response = await app.request(jsonRequest('/api/events', {
    title: 'Sydney weekend',
    currency: 'AUD',
    displayName: 'Sarah'
  }))
  return responseJson<EventSnapshot>(response)
}

function testApp(): { app: ReturnType<typeof createApp>; notifier: FakeRealtimeNotifier } {
  const store = new MemoryStore()
  const notifier = new FakeRealtimeNotifier()
  const app = createApp({
    storeFactory: () => store,
    realtimeNotifierFactory: () => notifier
  })
  return { app, notifier }
}

async function addParticipant(
  app: ReturnType<typeof createApp>,
  token: string,
  displayName: string
): Promise<EventSnapshot> {
  const response = await app.request(jsonRequest(`/api/events/${token}/participants`, { displayName }))
  expect(response.status).toBe(200)
  return responseJson<EventSnapshot>(response)
}

async function createExpense(
  app: ReturnType<typeof createApp>,
  token: string,
  input: {
    description: string
    amount: string
    payerParticipantId: string
    shares: Array<{ participantId: string; amount: string }>
  }
): Promise<EventSnapshot> {
  const response = await app.request(jsonRequest(`/api/events/${token}/expenses`, input))
  expect(response.status).toBe(200)
  return responseJson<EventSnapshot>(response)
}

async function createSettlementPayment(
  app: ReturnType<typeof createApp>,
  token: string,
  input: {
    senderParticipantId: string
    recipientParticipantId: string
    amount: string
  }
): Promise<EventSnapshot> {
  const response = await app.request(jsonRequest(`/api/events/${token}/settlement-payments`, input))
  expect(response.status).toBe(200)
  return responseJson<EventSnapshot>(response)
}

async function expenseFixture(app: ReturnType<typeof createApp>): Promise<{
  token: string
  sarah: Participant
  alex: Participant
  expense: Expense
}> {
  const created = await createEvent(app)
  const token = created.event.token
  const sarah = created.participants[0]
  const withAlex = await addParticipant(app, token, 'Alex')
  const alex = requireParticipant(withAlex, 'Alex')
  const withExpense = await createExpense(app, token, {
    description: 'Dinner',
    amount: '80.00',
    payerParticipantId: sarah.id,
    shares: [
      { participantId: sarah.id, amount: '30.00' },
      { participantId: alex.id, amount: '50.00' }
    ]
  })
  return { token, sarah, alex, expense: requireExpense(withExpense, 'Dinner') }
}

async function settlementPaymentFixture(app: ReturnType<typeof createApp>): Promise<{
  token: string
  sarah: Participant
  alex: Participant
  expense: Expense
  settlementPayment: SettlementPayment
}> {
  const fixture = await expenseFixture(app)
  const withPayment = await createSettlementPayment(app, fixture.token, {
    senderParticipantId: fixture.alex.id,
    recipientParticipantId: fixture.sarah.id,
    amount: '50.00'
  })
  return {
    ...fixture,
    settlementPayment: requireSettlementPayment(withPayment, fixture.alex.id, fixture.sarah.id)
  }
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

function requireParticipant(snapshot: EventSnapshot, displayName: string): Participant {
  const participant = snapshot.participants.find((candidate) => candidate.displayName === displayName)
  if (!participant) {
    throw new Error(`Expected Participant ${displayName}`)
  }
  return participant
}

function requireExpense(snapshot: EventSnapshot, idOrDescription: string): Expense {
  const expense = snapshot.expenses.find((candidate) =>
    candidate.id === idOrDescription || candidate.description === idOrDescription
  )
  if (!expense) {
    throw new Error(`Expected Expense ${idOrDescription}`)
  }
  return expense
}

function requireSettlementPayment(
  snapshot: EventSnapshot,
  idOrSenderParticipantId: string,
  recipientParticipantId?: string
): SettlementPayment {
  const payment = snapshot.settlementPayments.find((candidate) =>
    candidate.id === idOrSenderParticipantId ||
    (
      candidate.senderParticipantId === idOrSenderParticipantId &&
      candidate.recipientParticipantId === recipientParticipantId
    )
  )
  if (!payment) {
    throw new Error(`Expected Settlement Payment ${idOrSenderParticipantId}`)
  }
  return payment
}

class FakeRealtimeNotifier implements EventRealtimeNotifier {
  readonly changedTokens: string[] = []
  readonly connectedTokens: string[] = []

  async eventChanged(token: string): Promise<void> {
    this.changedTokens.push(token)
  }

  async connect(token: string): Promise<Response> {
    this.connectedTokens.push(token)
    return new Response('connected')
  }

  reset(): void {
    this.changedTokens.length = 0
    this.connectedTokens.length = 0
  }
}
