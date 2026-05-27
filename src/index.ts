import { Hono } from 'hono'
import {
  CommandInputError,
  parseCreateEventInput,
  parseExpenseInput,
  parseParticipantDisplayName,
  parseSettlementPaymentInput
} from './event-command-input'
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
      if (error instanceof CommandInputError) {
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
      return store.addParticipant(c.req.param('token'), parseParticipantDisplayName(await readJson(c.req.raw)))
    })
  })

  app.patch('/api/events/:token/participants/:participantId', async (c) => {
    return handleStore(storeFactory(c.env), async (store) => {
      return store.renameParticipant(
        c.req.param('token'),
        c.req.param('participantId'),
        parseParticipantDisplayName(await readJson(c.req.raw))
      )
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
      return store.createExpense(c.req.param('token'), parseExpenseInput(await readJson(c.req.raw), snapshot.event.currency))
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
        parseExpenseInput(await readJson(c.req.raw), snapshot.event.currency)
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
        parseSettlementPaymentInput(await readJson(c.req.raw), snapshot.event.currency)
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
        parseSettlementPaymentInput(await readJson(c.req.raw), snapshot.event.currency)
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

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new CommandInputError('Request body must be JSON')
  }
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
    if (error instanceof CommandInputError) {
      return validationError(error.message)
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
