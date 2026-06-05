import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventRealtimeHub, EventRealtimeRoom, LocalEventRealtimeNotifier } from './event-realtime'
import type { EventRealtimeNotifier } from './event-realtime'
import { parseEventRealtimeMessage } from './event-realtime-protocol'
import { createApp } from './index'
import type { EventSnapshot } from './domain'
import { MemoryStore } from './store'

describe('Event realtime protocol', () => {
  it('parses only Event-change notifications from browser-delivered WebSocket data', () => {
    expect(parseEventRealtimeMessage('{"type":"event_changed"}')).toEqual({ type: 'event_changed' })
    expect(parseEventRealtimeMessage('pong')).toBeNull()
    expect(parseEventRealtimeMessage('{')).toBeNull()
    expect(parseEventRealtimeMessage('{"type":"presence_changed"}')).toBeNull()
    expect(parseEventRealtimeMessage(new ArrayBuffer(0))).toBeNull()
  })
})

describe('Event realtime room', () => {
  beforeEach(() => {
    installWebSocketGlobals()
  })

  it('broadcasts Event-change notifications to open clients in the room', async () => {
    const firstClient = new FakeWebSocket()
    const secondClient = new FakeWebSocket()
    const closedClient = new FakeWebSocket(WebSocket.CLOSED)
    const room = new EventRealtimeRoom()
    room.connect(firstClient)
    room.connect(secondClient)
    room.connect(closedClient)

    room.eventChanged()

    expect(firstClient.sent).toEqual(['{"type":"event_changed"}'])
    expect(secondClient.sent).toEqual(['{"type":"event_changed"}'])
    expect(closedClient.sent).toEqual([])
  })

  it('replies to browser heartbeat pings', () => {
    const client = new FakeWebSocket()
    const room = new EventRealtimeRoom()
    room.connect(client)

    room.receiveMessage(client, 'ping')

    expect(client.sent).toEqual(['pong'])
  })
})

describe('LocalEventRealtimeNotifier', () => {
  it('routes Event-change notifications only to the room named by token', async () => {
    const hub = new EventRealtimeHub()
    const tokenAClient = new FakeWebSocket()
    const tokenBClient = new FakeWebSocket()
    hub.room('event-token-a').connect(tokenAClient)
    hub.room('event-token-b').connect(tokenBClient)
    const notifier = new LocalEventRealtimeNotifier(hub)

    await notifier.eventChanged('event-token-a')

    expect(tokenAClient.sent).toEqual(['{"type":"event_changed"}'])
    expect(tokenBClient.sent).toEqual([])
  })
})

describe('Event realtime route notifications', () => {
  it('notifies once after a successful saved Event mutation', async () => {
    const { app, notifier } = testApp()
    const created = await createEvent(app)
    const token = created.event.token

    const response = await app.request(jsonRequest(`/api/events/${token}/participants`, {
      displayName: 'Alex'
    }))

    expect(response.status).toBe(200)
    expect(notifier.changedTokens).toEqual([token])
  })

  it('does not notify when an Event mutation fails before saving', async () => {
    const { app, notifier } = testApp()
    const created = await createEvent(app)
    const token = created.event.token

    const response = await app.request(jsonRequest(`/api/events/${token}/expenses`, {
      description: 'Dinner',
      amount: '80.00',
      payerParticipantId: created.participants[0].id
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Included Participants are required'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })
})

class FakeWebSocket {
  readonly sent: string[] = []
  readonly closed: Array<{ code?: number; reason?: string }> = []

  constructor(readonly readyState: number = WebSocket.OPEN) {}

  send(message: string): void {
    this.sent.push(message)
  }

  close(code?: number, reason?: string): void {
    this.closed.push({ code, reason })
  }
}

function installWebSocketGlobals(): void {
  vi.stubGlobal('WebSocket', {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  })
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

async function createEvent(app: ReturnType<typeof createApp>): Promise<EventSnapshot> {
  const response = await app.request(jsonRequest('/api/events', {
    title: 'Sydney weekend',
    currency: 'AUD',
    displayName: 'Sarah'
  }))
  return responseJson<EventSnapshot>(response)
}

function jsonRequest(path: string, body: unknown, method = 'POST'): Request {
  return new Request(`https://settleup.test${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

class FakeRealtimeNotifier implements EventRealtimeNotifier {
  readonly changedTokens: string[] = []

  async eventChanged(token: string): Promise<void> {
    this.changedTokens.push(token)
  }

  async connect(): Promise<Response> {
    return new Response('connected')
  }
}
