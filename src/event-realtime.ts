import { DurableObject } from 'cloudflare:workers'

export interface EventRealtimeNotifier {
  eventChanged(token: string): Promise<void>
  connect(token: string, request: Request): Promise<Response>
}

export class NoopEventRealtimeNotifier implements EventRealtimeNotifier {
  async eventChanged(): Promise<void> {}

  async connect(): Promise<Response> {
    return new Response('Realtime is not configured', { status: 503 })
  }
}

export class DurableObjectEventRealtimeNotifier implements EventRealtimeNotifier {
  constructor(private readonly rooms: DurableObjectNamespace<EventRealtimeRoom>) {}

  async eventChanged(token: string): Promise<void> {
    await this.rooms.getByName(token).eventChanged()
  }

  async connect(token: string, request: Request): Promise<Response> {
    return this.rooms.getByName(token).fetch(request)
  }
}

type EventRealtimeMessage = {
  type: 'event_changed'
}

export class EventRealtimeRoom extends DurableObject<CloudflareBindings> {
  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }

  async eventChanged(): Promise<void> {
    this.broadcast({ type: 'event_changed' })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === 'ping') {
      ws.send('pong')
    }
  }

  async webSocketClose(): Promise<void> {}

  async webSocketError(ws: WebSocket): Promise<void> {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1011, 'WebSocket error')
    }
  }

  private broadcast(message: EventRealtimeMessage): void {
    const payload = JSON.stringify(message)
    for (const client of this.ctx.getWebSockets()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    }
  }
}
