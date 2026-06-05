import {
  REALTIME_PING,
  REALTIME_PONG,
  eventChangedMessage,
  serializeEventRealtimeMessage
} from './event-realtime-protocol'
import type { EventRealtimeMessage } from './event-realtime-protocol'

const webSocketConnecting = 0
const webSocketOpen = 1

export interface EventRealtimeNotifier {
  eventChanged(token: string): Promise<void>
  connect(token: string, request: Request): Promise<Response>
}

export interface RealtimeClient {
  readonly readyState: number
  send(message: string): void
  close(code?: number, reason?: string): void
}

export class NoopEventRealtimeNotifier implements EventRealtimeNotifier {
  async eventChanged(): Promise<void> {}

  async connect(): Promise<Response> {
    return new Response('Realtime is not configured', { status: 503 })
  }
}

export class LocalEventRealtimeNotifier implements EventRealtimeNotifier {
  constructor(private readonly hub: EventRealtimeHub) {}

  async eventChanged(token: string): Promise<void> {
    this.hub.eventChanged(token)
  }

  async connect(): Promise<Response> {
    return new Response('Realtime upgrades are handled by the Node server', { status: 426 })
  }
}

export class EventRealtimeHub {
  private readonly rooms = new Map<string, EventRealtimeRoom>()

  room(token: string): EventRealtimeRoom {
    let room = this.rooms.get(token)
    if (!room) {
      room = new EventRealtimeRoom()
      this.rooms.set(token, room)
    }
    return room
  }

  eventChanged(token: string): void {
    this.room(token).eventChanged()
  }
}

export class EventRealtimeRoom {
  private readonly clients = new Set<RealtimeClient>()

  connect(client: RealtimeClient): () => void {
    this.clients.add(client)
    return () => {
      this.clients.delete(client)
    }
  }

  eventChanged(): void {
    this.broadcast(eventChangedMessage())
  }

  receiveMessage(client: RealtimeClient, message: string | Buffer | ArrayBuffer | Buffer[]): void {
    if (message.toString() === REALTIME_PING && client.readyState === webSocketOpen) {
      client.send(REALTIME_PONG)
    }
  }

  closeErroredClient(client: RealtimeClient): void {
    if (client.readyState === webSocketOpen || client.readyState === webSocketConnecting) {
      client.close(1011, 'WebSocket error')
    }
    this.clients.delete(client)
  }

  private broadcast(message: EventRealtimeMessage): void {
    const payload = serializeEventRealtimeMessage(message)
    for (const client of this.clients) {
      if (client.readyState === webSocketOpen) {
        client.send(payload)
      }
    }
  }
}
