import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DurableObjectEventRealtimeNotifier, EventRealtimeRoom } from './event-realtime'
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
    installWorkerWebSocketGlobals()
  })

  it('broadcasts Event-change notifications to open clients in the room', async () => {
    const firstClient = new FakeWebSocket()
    const secondClient = new FakeWebSocket()
    const closedClient = new FakeWebSocket(WebSocket.CLOSED)
    const room = new EventRealtimeRoom(
      fakeDurableObjectState([firstClient, secondClient, closedClient]),
      {} as CloudflareBindings
    )

    await room.eventChanged()

    expect(firstClient.sent).toEqual(['{"type":"event_changed"}'])
    expect(secondClient.sent).toEqual(['{"type":"event_changed"}'])
    expect(closedClient.sent).toEqual([])
  })
})

describe('DurableObjectEventRealtimeNotifier', () => {
  it('routes Event-change notifications only to the room named by token', async () => {
    const rooms = new FakeRoomNamespace()
    const notifier = new DurableObjectEventRealtimeNotifier(rooms.namespace)

    await notifier.eventChanged('event-token-a')

    expect(rooms.room('event-token-a').changedCount).toBe(1)
    expect(rooms.room('event-token-b').changedCount).toBe(0)
  })

  it('connects clients through the room named by Event token', async () => {
    const rooms = new FakeRoomNamespace()
    const notifier = new DurableObjectEventRealtimeNotifier(rooms.namespace)
    const request = new Request('https://settleup.test/api/events/event-token-a/realtime', {
      headers: { Upgrade: 'websocket' }
    })

    const response = await notifier.connect('event-token-a', request)

    expect(response.status).toBe(204)
    expect(rooms.room('event-token-a').connectedRequests).toEqual([request])
    expect(rooms.room('event-token-b').connectedRequests).toEqual([])
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
        message: 'Shares are required'
      }
    })
    expect(notifier.changedTokens).toEqual([])
  })
})

class FakeWebSocket {
  readonly sent: string[] = []

  constructor(readonly readyState: number = WebSocket.OPEN) {}

  send(message: string): void {
    this.sent.push(message)
  }
}

function fakeDurableObjectState(sockets: FakeWebSocket[]): DurableObjectState {
  return {
    acceptWebSocket: () => undefined,
    getWebSockets: () => sockets as unknown as WebSocket[],
    setWebSocketAutoResponse: () => undefined
  } as unknown as DurableObjectState
}

function installWorkerWebSocketGlobals(): void {
  vi.stubGlobal('WebSocket', {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  })
  vi.stubGlobal('WebSocketRequestResponsePair', class {
    constructor(
      readonly request: string,
      readonly response: string
    ) {}
  })
}

class FakeRoomNamespace {
  private readonly rooms = new Map<string, FakeRoomStub>()

  readonly namespace = {
    getByName: (name: string) => this.room(name)
  } as unknown as DurableObjectNamespace<EventRealtimeRoom>

  room(name: string): FakeRoomStub {
    let room = this.rooms.get(name)
    if (!room) {
      room = new FakeRoomStub()
      this.rooms.set(name, room)
    }
    return room
  }
}

class FakeRoomStub {
  changedCount = 0
  readonly connectedRequests: Request[] = []

  async eventChanged(): Promise<void> {
    this.changedCount += 1
  }

  async fetch(request: Request): Promise<Response> {
    this.connectedRequests.push(request)
    return new Response(null, { status: 204 })
  }
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
