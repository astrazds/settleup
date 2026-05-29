export const eventExpiresAfterDays = 3
export const eventCleanupAfterDays = 5

const millisecondsPerDay = 24 * 60 * 60 * 1000
const eventExpiresAfterMilliseconds = eventExpiresAfterDays * millisecondsPerDay
const eventCleanupAfterMilliseconds = eventCleanupAfterDays * millisecondsPerDay

export function isEventExpired(createdAt: string, now = new Date()): boolean {
  const createdTime = Date.parse(createdAt)
  if (!Number.isFinite(createdTime)) {
    return false
  }
  return now.getTime() - createdTime >= eventExpiresAfterMilliseconds
}

export function eventCleanupCutoff(now = new Date()): string {
  return new Date(now.getTime() - eventCleanupAfterMilliseconds).toISOString()
}
