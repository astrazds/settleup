import { Hono } from 'hono'
import {
  CommandInputError,
  parseCreateEventInput
} from './event-command-input'
import { executeSavedEventCommand } from './event-command-runtime'
import type { SavedEventCommandResult } from './event-command-runtime'
import {
  DurableObjectEventRealtimeNotifier,
  EventRealtimeRoom,
  NoopEventRealtimeNotifier
} from './event-realtime'
import type { EventRealtimeNotifier } from './event-realtime'
import { D1Store } from './store'
import type { AppStore } from './store'
import { clientScript } from './ui/client'
import { renderCreatePage, renderEventPage, renderNotFoundPage, stylesheet } from './ui/views'

export { EventRealtimeRoom }

type Bindings = CloudflareBindings & {
  EVENT_REALTIME?: DurableObjectNamespace<EventRealtimeRoom>
}

type StoreFactory = (env: Bindings) => AppStore
type RealtimeNotifierFactory = (env: Bindings | undefined) => EventRealtimeNotifier

interface AppDeps {
  storeFactory?: StoreFactory
  realtimeNotifierFactory?: RealtimeNotifierFactory
}

export function createApp(deps: AppDeps = {}): Hono<{ Bindings: Bindings }> {
  const app = new Hono<{ Bindings: Bindings }>()
  const storeFactory = deps.storeFactory ?? ((env: Bindings) => new D1Store(env.DB))
  const realtimeNotifierFactory = deps.realtimeNotifierFactory ?? defaultRealtimeNotifierFactory

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

  app.get('/api/events/:token/realtime', async (c) => {
    if (c.req.raw.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const token = c.req.param('token')
    const snapshot = await storeFactory(c.env).getEventByToken(token)
    if (!snapshot) {
      return new Response('Event not found', { status: 404 })
    }

    return realtimeNotifierFactory(c.env).connect(token, c.req.raw)
  })

  app.post('/api/events/:token/participants', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'addParticipant',
        token,
        body: await readJson(c.req.raw)
      }
    ))
  })

  app.patch('/api/events/:token/participants/:participantId', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'renameParticipant',
        token,
        participantId: c.req.param('participantId'),
        body: await readJson(c.req.raw)
      }
    ))
  })

  app.delete('/api/events/:token/participants/:participantId', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'deleteParticipant',
        token,
        participantId: c.req.param('participantId')
      }
    ))
  })

  app.post('/api/events/:token/expenses', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'createExpense',
        token,
        body: await readJson(c.req.raw)
      }
    ))
  })

  app.patch('/api/events/:token/expenses/:expenseId', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'updateExpense',
        token,
        expenseId: c.req.param('expenseId'),
        body: await readJson(c.req.raw)
      }
    ))
  })

  app.delete('/api/events/:token/expenses/:expenseId', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'deleteExpense',
        token,
        expenseId: c.req.param('expenseId')
      }
    ))
  })

  app.post('/api/events/:token/settlement-payments', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'createSettlementPayment',
        token,
        body: await readJson(c.req.raw)
      }
    ))
  })

  app.patch('/api/events/:token/settlement-payments/:settlementPaymentId', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'updateSettlementPayment',
        token,
        settlementPaymentId: c.req.param('settlementPaymentId'),
        body: await readJson(c.req.raw)
      }
    ))
  })

  app.delete('/api/events/:token/settlement-payments/:settlementPaymentId', async (c) => {
    const token = c.req.param('token')
    return handleSavedEventCommand(async () => executeSavedEventCommand(
      storeFactory(c.env),
      realtimeNotifierFactory(c.env),
      {
        type: 'deleteSettlementPayment',
        token,
        settlementPaymentId: c.req.param('settlementPaymentId')
      }
    ))
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

async function handleSavedEventCommand(command: () => Promise<SavedEventCommandResult>): Promise<Response> {
  try {
    return savedEventCommandResponse(await command())
  } catch (error: unknown) {
    if (error instanceof CommandInputError) {
      return validationError(error.message)
    }
    throw error
  }
}

function savedEventCommandResponse(result: SavedEventCommandResult): Response {
  if (result.ok) {
    return Response.json(result.snapshot)
  }
  return jsonError(result.error.code, result.error.message, result.error.status)
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

function defaultRealtimeNotifierFactory(env: Bindings | undefined): EventRealtimeNotifier {
  if (!env?.EVENT_REALTIME) {
    return new NoopEventRealtimeNotifier()
  }
  return new DurableObjectEventRealtimeNotifier(env.EVENT_REALTIME)
}
