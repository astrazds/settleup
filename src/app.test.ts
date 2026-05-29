import { describe, expect, it } from 'vitest'
import { executeSavedEventCommand } from './event-command-runtime'
import worker, { createApp } from './index'
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

  it('keeps safe submitted HTML Event values on validation errors', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request(formRequest('/events', {
      title: 'Dinner "crew" <script>',
      currency: 'AUD',
      displayName: ' '
    }))
    const html = await response.text()

    expect(response.status).toBe(400)
    expect(html).toContain('Participant display name is required')
    expect(html).toContain('value="Dinner &quot;crew&quot; &lt;script&gt;"')
    expect(html).toContain('<option value="AUD" selected>AUD</option>')
    expect(html).toContain('name="displayName" required autocomplete="name" dir="auto"')
    expect(html).toContain('aria-invalid="true" aria-describedby="create-display-name-error" autofocus')
    expect(html).toContain('id="create-display-name-error"')
    expect(html).not.toContain('Dinner "crew" <script>')
  })

  it('serves a quiet favicon response for browser polish', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const response = await app.request('/favicon.ico')

    expect(response.status).toBe(204)
  })

  it('exposes scheduled cleanup for Cloudflare Cron Triggers', () => {
    expect(worker.scheduled).toEqual(expect.any(Function))
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
      includedParticipantIds: [sarah.id, alex.id]
    }))
    expect(expenseResponse.status).toBe(200)
    const withExpense = await responseJson<EventSnapshot>(expenseResponse)
    expect(withExpense.expenses).toEqual([
      expect.objectContaining({ description: 'Dinner', amountMinor: 8000 })
    ])
    expect(withExpense.balances).toEqual([
      { participantId: sarah.id, amountMinor: 4000 },
      { participantId: alex.id, amountMinor: -4000 }
    ])
    expect(withExpense.suggestedSettlements).toEqual([
      { senderParticipantId: alex.id, recipientParticipantId: sarah.id, amountMinor: 4000 }
    ])

    const paymentResponse = await app.request(jsonRequest(`/api/events/${token}/settlement-payments`, {
      senderParticipantId: alex.id,
      recipientParticipantId: sarah.id,
      amount: '40.00'
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
      includedParticipantIds: [alex.id]
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

  it('rejects Expense commands without Included Participants using the route validation error shape', async () => {
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
        message: 'Included Participants are required'
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

describe('Saved Event command execution', () => {
  it('creates an Expense through the shared command lifecycle and notifies after saving', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const created = await store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })
    const withAlex = await store.addParticipant(created.event.token, 'Alex')
    const sarah = requireParticipant(withAlex, 'Sarah')
    const alex = requireParticipant(withAlex, 'Alex')

    const result = await executeSavedEventCommand(store, notifier, {
      type: 'createExpense',
      token: created.event.token,
      body: {
        description: 'Dinner',
        amount: '80.00',
        payerParticipantId: sarah.id,
        includedParticipantIds: [sarah.id, alex.id]
      }
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    expect(result.snapshot.expenses).toEqual([
      expect.objectContaining({ description: 'Dinner', amountMinor: 8000 })
    ])
    expect(result.snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: alex.id, recipientParticipantId: sarah.id, amountMinor: 4000 }
    ])
    expect(notifier.changedTokens).toEqual([created.event.token])
  })

  it('updates and deletes Expenses through the shared command lifecycle', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const fixture = await savedEventExpenseFixture(store)

    const updateResult = await executeSavedEventCommand(store, notifier, {
      type: 'updateExpense',
      token: fixture.token,
      expenseId: fixture.expense.id,
      body: {
        description: 'Groceries',
        amount: '60.00',
        payerParticipantId: fixture.sarah.id,
        includedParticipantIds: [fixture.sarah.id, fixture.alex.id]
      }
    })

    expect(updateResult.ok).toBe(true)
    if (!updateResult.ok) {
      throw new Error(updateResult.error.message)
    }
    expect(requireExpense(updateResult.snapshot, fixture.expense.id)).toEqual(expect.objectContaining({
      description: 'Groceries',
      amountMinor: 6000
    }))

    const deleteResult = await executeSavedEventCommand(store, notifier, {
      type: 'deleteExpense',
      token: fixture.token,
      expenseId: fixture.expense.id
    })

    expect(deleteResult.ok).toBe(true)
    if (!deleteResult.ok) {
      throw new Error(deleteResult.error.message)
    }
    expect(deleteResult.snapshot.expenses).toEqual([])
    expect(deleteResult.snapshot.balances).toEqual([
      { participantId: fixture.sarah.id, amountMinor: 0 },
      { participantId: fixture.alex.id, amountMinor: 0 }
    ])
    expect(notifier.changedTokens).toEqual([fixture.token, fixture.token])
  })

  it('executes Settlement Payment mutations through the shared command lifecycle', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const fixture = await savedEventExpenseFixture(store)

    const createResult = await executeSavedEventCommand(store, notifier, {
      type: 'createSettlementPayment',
      token: fixture.token,
      body: {
        senderParticipantId: fixture.alex.id,
        recipientParticipantId: fixture.sarah.id,
        amount: '50.00'
      }
    })

    expect(createResult.ok).toBe(true)
    if (!createResult.ok) {
      throw new Error(createResult.error.message)
    }
    const payment = requireSettlementPayment(createResult.snapshot, fixture.alex.id, fixture.sarah.id)
    expect(payment).toEqual(expect.objectContaining({ amountMinor: 5000 }))

    const updateResult = await executeSavedEventCommand(store, notifier, {
      type: 'updateSettlementPayment',
      token: fixture.token,
      settlementPaymentId: payment.id,
      body: {
        senderParticipantId: fixture.alex.id,
        recipientParticipantId: fixture.sarah.id,
        amount: '25.00'
      }
    })

    expect(updateResult.ok).toBe(true)
    if (!updateResult.ok) {
      throw new Error(updateResult.error.message)
    }
    expect(requireSettlementPayment(updateResult.snapshot, payment.id)).toEqual(expect.objectContaining({
      amountMinor: 2500
    }))

    const deleteResult = await executeSavedEventCommand(store, notifier, {
      type: 'deleteSettlementPayment',
      token: fixture.token,
      settlementPaymentId: payment.id
    })

    expect(deleteResult.ok).toBe(true)
    if (!deleteResult.ok) {
      throw new Error(deleteResult.error.message)
    }
    expect(deleteResult.snapshot.settlementPayments).toEqual([])
    expect(notifier.changedTokens).toEqual([fixture.token, fixture.token, fixture.token])
  })

  it('returns command errors without notifying when validation or not-found checks fail', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const fixture = await savedEventExpenseFixture(store)

    const validationResult = await executeSavedEventCommand(store, notifier, {
      type: 'updateExpense',
      token: fixture.token,
      expenseId: fixture.expense.id,
      body: {
        description: 'Groceries',
        amount: '60.00',
        payerParticipantId: fixture.sarah.id,
        includedParticipantIds: ['missing-participant']
      }
    })
    const notFoundResult = await executeSavedEventCommand(store, notifier, {
      type: 'deleteSettlementPayment',
      token: fixture.token,
      settlementPaymentId: 'missing-payment'
    })

    expect(validationResult).toEqual({
      ok: false,
      error: {
        code: 'validation_error',
        message: 'Each Included Participant must be an existing Participant',
        status: 400
      }
    })
    expect(notFoundResult).toEqual({
      ok: false,
      error: {
        code: 'not_found',
        message: 'Settlement Payment not found',
        status: 404
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })

  it('keeps saved changes when realtime notification fails', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    notifier.failEventChanged = true
    const created = await store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })

    const result = await executeSavedEventCommand(store, notifier, {
      type: 'addParticipant',
      token: created.event.token,
      body: { displayName: 'Alex' }
    })

    expect(result.ok).toBe(true)
    const saved = await store.getEventByToken(created.event.token)
    expect(saved?.participants.map((participant) => participant.displayName)).toEqual(['Sarah', 'Alex'])
    expect(notifier.changedTokens).toEqual([created.event.token])
  })

  it('executes Participant mutations through the shared command lifecycle', async () => {
    const store = new MemoryStore()
    const notifier = new FakeRealtimeNotifier()
    const created = await store.createEvent({
      title: 'Sydney weekend',
      currency: 'AUD',
      displayName: 'Sarah'
    })
    const withAlex = await store.addParticipant(created.event.token, 'Alex')
    const alex = requireParticipant(withAlex, 'Alex')

    const renamedResult = await executeSavedEventCommand(store, notifier, {
      type: 'renameParticipant',
      token: created.event.token,
      participantId: alex.id,
      body: { displayName: 'Alex Lee' }
    })

    expect(renamedResult.ok).toBe(true)
    if (!renamedResult.ok) {
      throw new Error(renamedResult.error.message)
    }
    expect(requireParticipant(renamedResult.snapshot, 'Alex Lee')).toEqual(expect.objectContaining({
      id: alex.id,
      order: alex.order
    }))

    const deleteResult = await executeSavedEventCommand(store, notifier, {
      type: 'deleteParticipant',
      token: created.event.token,
      participantId: alex.id
    })

    expect(deleteResult.ok).toBe(true)
    if (!deleteResult.ok) {
      throw new Error(deleteResult.error.message)
    }
    expect(deleteResult.snapshot.participants.map((participant) => participant.id)).not.toContain(alex.id)
    expect(notifier.changedTokens).toEqual([created.event.token, created.event.token])
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
      includedParticipantIds: [alex.id]
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
      includedParticipantIds: [fixture.sarah.id, fixture.alex.id]
    }, 'PATCH'))

    expect(response.status).toBe(200)
    const snapshot = await responseJson<EventSnapshot>(response)
    expect(requireExpense(snapshot, fixture.expense.id)).toEqual(expect.objectContaining({
      description: 'Groceries',
      amountMinor: 6000,
      payerParticipantId: fixture.sarah.id,
      shares: [
        { participantId: fixture.sarah.id, amountMinor: 3000 },
        { participantId: fixture.alex.id, amountMinor: 3000 }
      ]
    }))
    expect(snapshot.balances).toEqual([
      { participantId: fixture.sarah.id, amountMinor: 3000 },
      { participantId: fixture.alex.id, amountMinor: -3000 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: fixture.alex.id, recipientParticipantId: fixture.sarah.id, amountMinor: 3000 }
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
      includedParticipantIds: []
    }, 'PATCH'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Choose at least one Participant to split between'
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
      includedParticipantIds: [fixture.sarah.id, fixture.alex.id]
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
      { participantId: fixture.sarah.id, amountMinor: 1500 },
      { participantId: fixture.alex.id, amountMinor: -1500 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: fixture.alex.id, recipientParticipantId: fixture.sarah.id, amountMinor: 1500 }
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
      { participantId: fixture.sarah.id, amountMinor: 4000 },
      { participantId: fixture.alex.id, amountMinor: -4000 }
    ])
    expect(snapshot.suggestedSettlements).toEqual([
      { senderParticipantId: fixture.alex.id, recipientParticipantId: fixture.sarah.id, amountMinor: 4000 }
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
    expect(html).toContain('Create a shared expense Event')
    expect(html).toContain('Use it for a trip, dinner, or shared cost.')
    expect(html).toContain('Next, share the private Event Link. Anyone with the link can view and edit.')
    expect(html).toContain('class="brand"')
    expect(html).toContain('class="privacy-note"')
    expect(html).toContain('class="create-submit-row"')
    expect(html).toContain('data-create-readiness')
    expect(html).toContain('data-create-submit')
    expect(html).not.toContain('Private-by-Link')
    expect(html).toContain('novalidate data-create-form')
    expect(html).toContain('<input type="text" name="title" required autocomplete="off" dir="auto"')
    expect(html).toContain('id="create-title-error"')
    expect(html).toContain('Enter an Event Title.')
    expect(html).toContain('id="create-privacy-note"')
    expect(html).toContain('<option value="AUD">AUD</option>')
    expect(html).toContain('<option value="NZD">NZD</option>')
    expect(html).toMatch(/href="\/static\/styles\.[a-z0-9]+\.css"/)
  })

  it('serves versioned frontend assets with immutable caching', async () => {
    const store = new MemoryStore()
    const app = createApp({ storeFactory: () => store })

    const createHtml = await (await app.request('/')).text()
    const stylesheetPath = requiredMatch(createHtml, /href="(\/static\/styles\.[a-z0-9]+\.css)"/)
    const created = await createEvent(app)
    const eventHtml = await (await app.request(created.event.eventLinkPath)).text()
    const clientScriptPath = requiredMatch(eventHtml, /src="(\/static\/client\.[a-z0-9]+\.js)"/)

    const styleResponse = await app.request(stylesheetPath)
    const clientResponse = await app.request(clientScriptPath)
    const styles = await styleResponse.text()
    const client = await clientResponse.text()

    expect(styleResponse.status).toBe(200)
    expect(styleResponse.headers.get('cache-control')).toBe('public, max-age=31556952, immutable')
    expect(styleResponse.headers.get('etag')).toMatch(/^"[a-z0-9]+"$/)
    expect(styles).toContain('--on-ledger')
    expect(styles).toContain('min-height: 100svh')
    expect(styles).toContain('.create-form button')
    expect(styles).toContain('@media (max-height: 560px) and (orientation: landscape)')
    expect(styles).toContain('overflow-wrap: anywhere')
    expect(styles).toContain('.event-title-line [data-event-title]')
    expect(styles).toContain('.history-actions button')
    expect(styles).toContain('input[aria-invalid="true"]')
    expect(styles).toContain('.field-error')
    expect(styles).toContain('input::placeholder')
    expect(styles).toContain('text-wrap: balance')
    expect(styles).toContain('.create-readiness')
    expect(styles).toContain('data-create-submit')
    expect(styles).toContain('.ledger-row.row-positive')
    expect(styles).toContain('@media (max-width: 820px)')
    expect(clientResponse.status).toBe(200)
    expect(clientResponse.headers.get('cache-control')).toBe('public, max-age=31556952, immutable')
    expect(clientResponse.headers.get('etag')).toMatch(/^"[a-z0-9]+"$/)
    expect(client).toContain('Adding as')
    expect(client).toContain('data-included-participants')
    expect(client).toContain('Event Link copied')
  })

  it('keeps legacy static asset paths conservative and rejects unknown versions', async () => {
    const app = createApp({ storeFactory: () => new MemoryStore() })

    const legacyStyles = await app.request('/static/styles.css')
    const legacyClient = await app.request('/static/client.js')
    const missingAsset = await app.request('/static/client.missing.js')

    expect(legacyStyles.status).toBe(200)
    expect(legacyStyles.headers.get('cache-control')).toBe('no-store')
    expect(legacyClient.status).toBe(200)
    expect(legacyClient.headers.get('cache-control')).toBe('no-store')
    expect(missingAsset.status).toBe(404)
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

function requiredMatch(value: string, pattern: RegExp): string {
  const match = value.match(pattern)
  if (!match?.[1]) {
    throw new Error(`Expected value to match ${pattern}`)
  }
  return match[1]
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
    includedParticipantIds: string[]
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
    includedParticipantIds: [sarah.id, alex.id]
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
    amount: '40.00'
  })
  return {
    ...fixture,
    settlementPayment: requireSettlementPayment(withPayment, fixture.alex.id, fixture.sarah.id)
  }
}

async function savedEventExpenseFixture(store: MemoryStore): Promise<{
  token: string
  sarah: Participant
  alex: Participant
  expense: Expense
}> {
  const created = await store.createEvent({
    title: 'Sydney weekend',
    currency: 'AUD',
    displayName: 'Sarah'
  })
  const token = created.event.token
  const sarah = created.participants[0]
  const withAlex = await store.addParticipant(token, 'Alex')
  const alex = requireParticipant(withAlex, 'Alex')
  const withExpense = await store.createExpense(token, {
    description: 'Dinner',
    amountMinor: 8000,
    payerParticipantId: sarah.id,
    shares: [
      { participantId: sarah.id, amountMinor: 3000 },
      { participantId: alex.id, amountMinor: 5000 }
    ]
  })
  return { token, sarah, alex, expense: requireExpense(withExpense, 'Dinner') }
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
  failEventChanged = false

  async eventChanged(token: string): Promise<void> {
    this.changedTokens.push(token)
    if (this.failEventChanged) {
      throw new Error('Realtime unavailable')
    }
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
