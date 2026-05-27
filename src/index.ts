import { Hono } from 'hono'
import {
  parseCurrency,
  parseMoney,
  trimRequired
} from './domain'
import type { ExpenseInput, Result, SettlementPaymentInput, Share, SupportedCurrency } from './domain'
import { D1Store, StoreError } from './store'
import type { AppStore } from './store'
import { clientScript } from './ui/client'
import { renderCreatePage, renderEventPage, renderNotFoundPage, stylesheet } from './ui/views'

type Bindings = CloudflareBindings

type StoreFactory = (env: Bindings) => AppStore

interface AppDeps {
  storeFactory?: StoreFactory
}

export function createApp(deps: AppDeps = {}): Hono<{ Bindings: Bindings }> {
  const app = new Hono<{ Bindings: Bindings }>()
  const storeFactory = deps.storeFactory ?? ((env: Bindings) => new D1Store(env.DB))

  app.get('/', (c) => {
    return c.html(renderCreatePage(), 200, {
      'x-robots-tag': 'noindex'
    })
  })

  app.post('/events', async (c) => {
    const body = await c.req.parseBody()
    const input = parseCreateEventInput(body)
    if (!input.ok) {
      return c.html(renderCreatePage(input.message), 400, {
        'x-robots-tag': 'noindex'
      })
    }

    const snapshot = await storeFactory(c.env).createEvent(input.value)
    return c.redirect(snapshot.event.eventLinkPath, 303)
  })

  app.get('/e/:token', async (c) => {
    const snapshot = await storeFactory(c.env).getEventByToken(c.req.param('token'))
    if (!snapshot) {
      return c.html(renderNotFoundPage(), 404, {
        'x-robots-tag': 'noindex'
      })
    }

    return c.html(renderEventPage(snapshot.event), 200, {
      'x-robots-tag': 'noindex'
    })
  })

  app.get('/static/client.js', (c) => {
    return c.text(clientScript, 200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store'
    })
  })

  app.get('/static/styles.css', (c) => {
    return c.text(stylesheet, 200, {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': 'no-store'
    })
  })

  app.post('/api/events', async (c) => {
    let body: unknown
    try {
      body = await readJson(c.req.raw)
    } catch (error: unknown) {
      if (error instanceof StoreError) {
        return validationError(error.message)
      }
      throw error
    }

    const input = parseCreateEventInput(body)
    if (!input.ok) {
      return validationError(input.message)
    }

    return jsonCreated(await storeFactory(c.env).createEvent(input.value))
  })

  app.get('/api/events/:token', async (c) => {
    const snapshot = await storeFactory(c.env).getEventByToken(c.req.param('token'))
    if (!snapshot) {
      return jsonError('not_found', 'Event not found', 404)
    }
    return Response.json(snapshot)
  })

  app.post('/api/events/:token/participants', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      const name = trimRequired(field(await readJson(c.req.raw), 'displayName'), 'Participant display name')
      if (!name.ok) {
        throw new StoreError(name.message)
      }
      return store.addParticipant(c.req.param('token'), name.value)
    })
  })

  app.patch('/api/events/:token/participants/:participantId', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      const name = trimRequired(field(await readJson(c.req.raw), 'displayName'), 'Participant display name')
      if (!name.ok) {
        throw new StoreError(name.message)
      }
      return store.renameParticipant(c.req.param('token'), c.req.param('participantId'), name.value)
    })
  })

  app.delete('/api/events/:token/participants/:participantId', async (c) => {
    return handleStore(storeFactory(c.env), (store) =>
      store.deleteParticipant(c.req.param('token'), c.req.param('participantId'))
    )
  })

  app.post('/api/events/:token/expenses', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      const snapshot = await store.getEventByToken(c.req.param('token'))
      if (!snapshot) {
        throw new StoreError('Event not found', 404)
      }
      return store.createExpense(c.req.param('token'), parseExpenseBody(await readJson(c.req.raw), snapshot.event.currency))
    })
  })

  app.patch('/api/events/:token/expenses/:expenseId', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      const snapshot = await store.getEventByToken(c.req.param('token'))
      if (!snapshot) {
        throw new StoreError('Event not found', 404)
      }
      return store.updateExpense(
        c.req.param('token'),
        c.req.param('expenseId'),
        parseExpenseBody(await readJson(c.req.raw), snapshot.event.currency)
      )
    })
  })

  app.delete('/api/events/:token/expenses/:expenseId', async (c) => {
    return handleStore(storeFactory(c.env), (store) => store.deleteExpense(c.req.param('token'), c.req.param('expenseId')))
  })

  app.post('/api/events/:token/settlement-payments', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      const snapshot = await store.getEventByToken(c.req.param('token'))
      if (!snapshot) {
        throw new StoreError('Event not found', 404)
      }
      return store.createSettlementPayment(
        c.req.param('token'),
        parseSettlementPaymentBody(await readJson(c.req.raw), snapshot.event.currency)
      )
    })
  })

  app.patch('/api/events/:token/settlement-payments/:settlementPaymentId', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      const snapshot = await store.getEventByToken(c.req.param('token'))
      if (!snapshot) {
        throw new StoreError('Event not found', 404)
      }
      return store.updateSettlementPayment(
        c.req.param('token'),
        c.req.param('settlementPaymentId'),
        parseSettlementPaymentBody(await readJson(c.req.raw), snapshot.event.currency)
      )
    })
  })

  app.delete('/api/events/:token/settlement-payments/:settlementPaymentId', async (c) => {
    return handleStore(storeFactory(c.env), (store) =>
      store.deleteSettlementPayment(c.req.param('token'), c.req.param('settlementPaymentId'))
    )
  })

  return app
}

const app = createApp()

export default app

function parseCreateEventInput(raw: unknown): Result<{ title: string; currency: SupportedCurrency; displayName: string }> {
  const title = trimRequired(field(raw, 'title'), 'Event Title')
  if (!title.ok) {
    return title
  }
  const currency = parseCurrency(field(raw, 'currency'))
  if (!currency.ok) {
    return currency
  }
  const displayName = trimRequired(field(raw, 'displayName'), 'Participant display name')
  if (!displayName.ok) {
    return displayName
  }
  return createResult({ title: title.value, currency: currency.value, displayName: displayName.value })
}

function parseExpenseBody(raw: unknown, currency: string): ExpenseInput {
  const description = trimRequired(field(raw, 'description'), 'Expense description')
  if (!description.ok) {
    throw new StoreError(description.message)
  }
  const amount = parseMoney(field(raw, 'amount'), currency)
  if (!amount.ok) {
    throw new StoreError(amount.message)
  }
  const payer = trimRequired(field(raw, 'payerParticipantId'), 'Payer')
  if (!payer.ok) {
    throw new StoreError(payer.message)
  }

  return {
    description: description.value,
    amountMinor: amount.value,
    payerParticipantId: payer.value,
    shares: parseShares(field(raw, 'shares'), currency)
  }
}

function parseShares(raw: unknown, currency: string): Share[] {
  if (!Array.isArray(raw)) {
    throw new StoreError('Shares are required')
  }

  return raw.map((item) => {
    const participantId = trimRequired(field(item, 'participantId'), 'Share Participant')
    if (!participantId.ok) {
      throw new StoreError(participantId.message)
    }
    const amount = parseMoney(field(item, 'amount'), currency)
    if (!amount.ok) {
      throw new StoreError(amount.message)
    }
    return {
      participantId: participantId.value,
      amountMinor: amount.value
    }
  })
}

function parseSettlementPaymentBody(raw: unknown, currency: string): SettlementPaymentInput {
  const sender = trimRequired(field(raw, 'senderParticipantId'), 'Sender')
  if (!sender.ok) {
    throw new StoreError(sender.message)
  }
  const recipient = trimRequired(field(raw, 'recipientParticipantId'), 'Recipient')
  if (!recipient.ok) {
    throw new StoreError(recipient.message)
  }
  const amount = parseMoney(field(raw, 'amount'), currency)
  if (!amount.ok) {
    throw new StoreError(amount.message)
  }

  return {
    senderParticipantId: sender.value,
    recipientParticipantId: recipient.value,
    amountMinor: amount.value
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new StoreError('Request body must be JSON')
  }
}

function field(raw: unknown, key: string): unknown {
  if (raw && typeof raw === 'object' && key in raw) {
    return (raw as Record<string, unknown>)[key]
  }
  return undefined
}

async function handleStore(
  store: AppStore,
  action: (store: AppStore) => Promise<unknown>
): Promise<Response> {
  try {
    return Response.json(await action(store))
  } catch (error: unknown) {
    if (error instanceof StoreError) {
      return jsonError(error.status === 404 ? 'not_found' : 'validation_error', error.message, error.status)
    }
    throw error
  }
}

function validationError(message: string): Response {
  return jsonError('validation_error', message, 400)
}

function jsonError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status })
}

function jsonCreated(value: unknown): Response {
  return Response.json(value, { status: 201 })
}

function createResult<T>(value: T): { ok: true; value: T } {
  return { ok: true, value }
}
