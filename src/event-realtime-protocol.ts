export const EVENT_REALTIME_MESSAGE_TYPE = {
  eventChanged: 'event_changed'
} as const

export const EVENT_REALTIME_PING = 'ping'
export const EVENT_REALTIME_PONG = 'pong'
export const EVENT_REALTIME_FALLBACK_POLL_MS = 8000
export const EVENT_REALTIME_RECONNECT_BASE_MS = 1000
export const EVENT_REALTIME_RECONNECT_MAX_MS = 30000

export type EventRealtimeMessage =
  | { type: typeof EVENT_REALTIME_MESSAGE_TYPE.eventChanged }

export function eventChangedMessage(): EventRealtimeMessage {
  return { type: EVENT_REALTIME_MESSAGE_TYPE.eventChanged }
}

export function serializeEventRealtimeMessage(message: EventRealtimeMessage): string {
  return JSON.stringify(message)
}

export function parseEventRealtimeMessage(data: unknown): EventRealtimeMessage | null {
  if (data === EVENT_REALTIME_PONG || typeof data !== 'string') {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }

  if (isEventChangedMessage(parsed)) {
    return parsed
  }

  return null
}

export function eventRealtimeRoutePath(token: string): string {
  return `/api/events/${token}/realtime`
}

export function eventRealtimeReconnectDelay(attempt: number): number {
  return Math.min(
    EVENT_REALTIME_RECONNECT_BASE_MS * 2 ** (attempt - 1),
    EVENT_REALTIME_RECONNECT_MAX_MS
  )
}

function isEventChangedMessage(value: unknown): value is EventRealtimeMessage {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === EVENT_REALTIME_MESSAGE_TYPE.eventChanged
  )
}
