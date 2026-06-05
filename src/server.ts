import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import type { RawData, WebSocket } from 'ws'
import { EventRealtimeHub, LocalEventRealtimeNotifier } from './event-realtime'
import { createApp, cleanupExpiredEvents } from './index'
import { createSqliteRuntime } from './node-sqlite'

const defaultPort = 8787
const defaultHostname = '127.0.0.1'
const defaultDatabasePath = '.data/settleup.sqlite'
const cleanupIntervalMs = 60 * 60 * 1000

const port = portFromArgs(process.argv) ?? portFromEnv(process.env.PORT) ?? defaultPort
const hostname = process.env.HOST ?? defaultHostname
const databasePath = process.env.SETTLEUP_DATABASE_PATH ?? defaultDatabasePath

const runtime = createSqliteRuntime(databasePath)
const realtimeHub = new EventRealtimeHub()
const realtimeNotifier = new LocalEventRealtimeNotifier(realtimeHub)
const app = createApp({
  storeFactory: () => runtime.store,
  realtimeNotifierFactory: () => realtimeNotifier
})

const server = serve({
  fetch: app.fetch,
  port,
  hostname
}, (info) => {
  console.log(`SettleUp listening at http://${info.address}:${info.port}`)
  console.log(`SQLite database: ${databasePath}`)
})
const webSocketServer = new WebSocketServer({ noServer: true })
const cleanupTimer = setInterval(() => {
  cleanupExpiredEvents(runtime.store).catch((error: unknown) => {
    console.error(JSON.stringify({
      level: 'error',
      message: 'event_cleanup_failed',
      error: error instanceof Error ? error.message : String(error)
    }))
  })
}, cleanupIntervalMs)
cleanupTimer.unref()

server.on('upgrade', (request, socket, head) => {
  const token = realtimeTokenFromRequest(request.url, request.headers.host)
  if (!token) {
    socket.destroy()
    return
  }

  runtime.store.getEventByToken(token)
    .then((snapshot) => {
      if (!snapshot) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n')
        socket.destroy()
        return
      }

      webSocketServer.handleUpgrade(request, socket, head, (client) => {
        connectRealtimeClient(token, client)
        webSocketServer.emit('connection', client, request)
      })
    })
    .catch((error: unknown) => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'event_realtime_upgrade_failed',
        token,
        error: error instanceof Error ? error.message : String(error)
      }))
      socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n')
      socket.destroy()
    })
})

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

function connectRealtimeClient(token: string, client: WebSocket): void {
  const room = realtimeHub.room(token)
  const disconnect = room.connect(client)
  client.on('message', (message: RawData) => {
    room.receiveMessage(client, message)
  })
  client.on('close', disconnect)
  client.on('error', () => {
    room.closeErroredClient(client)
  })
}

function realtimeTokenFromRequest(requestUrl: string | undefined, host: string | undefined): string | null {
  if (!requestUrl) {
    return null
  }
  const url = new URL(requestUrl, `http://${host ?? 'localhost'}`)
  const match = /^\/api\/events\/([^/]+)\/realtime$/.exec(url.pathname)
  return match ? decodeURIComponent(match[1]) : null
}

function portFromArgs(argv: string[]): number | null {
  const portIndex = argv.indexOf('--port')
  if (portIndex < 0) {
    return null
  }
  return portFromEnv(argv[portIndex + 1])
}

function portFromEnv(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null
}

function shutdown(): void {
  clearInterval(cleanupTimer)
  webSocketServer.close()
  server.close(() => {
    runtime.db.close()
    process.exit(0)
  })
}
