import { describe, expect, it } from 'vitest'
import { createApp } from './index'
import type { EventSnapshot, Participant } from './domain'
import { MemoryStore } from './store'

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`https://settleup.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
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
})

describe('Event workflows', () => {
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
