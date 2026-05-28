export const EVENT_REALTIME_MESSAGE_TYPE = {
  eventChanged: 'event_changed'
} as const

export const EVENT_REALTIME_PING = 'ping'
export const EVENT_REALTIME_PONG = 'pong'
export const EVENT_REALTIME_FALLBACK_POLL_MS = 8000
export const EVENT_REALTIME_RECONNECT_BASE_MS = 1000
export const EVENT_REALTIME_RECONNECT_MAX_MS = 30000
export const EVENT_REALTIME_PROTOCOL_CLIENT_SCRIPT = String.raw`
const eventRealtimeMessageType = ${JSON.stringify(EVENT_REALTIME_MESSAGE_TYPE.eventChanged)}
const eventRealtimePong = ${JSON.stringify(EVENT_REALTIME_PONG)}
const eventRealtimeFallbackPollMs = ${JSON.stringify(EVENT_REALTIME_FALLBACK_POLL_MS)}
const eventRealtimeReconnectBaseMs = ${JSON.stringify(EVENT_REALTIME_RECONNECT_BASE_MS)}
const eventRealtimeReconnectMaxMs = ${JSON.stringify(EVENT_REALTIME_RECONNECT_MAX_MS)}

function parseEventRealtimeMessage(data) {
  if (data === eventRealtimePong || typeof data !== 'string') return null

  let message = null
  try {
    message = JSON.parse(data)
  } catch {
    return null
  }

  if (message && typeof message === 'object' && message.type === eventRealtimeMessageType) {
    return { type: eventRealtimeMessageType }
  }

  return null
}

function eventRealtimeRoutePath(eventToken) {
  return '/api/events/' + eventToken + '/realtime'
}

function eventRealtimeReconnectDelay(attempt) {
  return Math.min(eventRealtimeReconnectBaseMs * 2 ** (attempt - 1), eventRealtimeReconnectMaxMs)
}
`

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
