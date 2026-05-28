import { EVENT_REALTIME_PROTOCOL_CLIENT_SCRIPT } from '../event-realtime-protocol'

export const clientBootstrapScript = `${EVENT_REALTIME_PROTOCOL_CLIENT_SCRIPT}
${String.raw`
const app = document.querySelector('#app')
const token = app?.dataset.token
let snapshot = null
let currentParticipantId = token ? localStorage.getItem('settleup:participant:' + token) : null
let fallbackPollingId = null
let realtimeSocket = null
let realtimeReconnectId = null
let realtimeReconnectAttempt = 0
let settlementFocus = false
let activeSuggestionKey = null
let expenseDraftDirty = false
let settlementDraftDirty = false
let toastHideId = null

if (app && token) {
  boot()
}

async function boot() {
  await refresh(false)
  startRealtime()
}

async function refresh(preserveDrafts, completeMessage) {
  const previousEventUpdatedAt = snapshot?.event?.updatedAt || null
  if (preserveDrafts) {
    showToast('Refreshing Event data...')
  }
  const response = await fetch('/api/events/' + token)
  if (!response.ok) {
    app.innerHTML = '<section class="section"><h1>Event not found</h1><p class="subtle">This Event Link does not work.</p></section>'
    return
  }
  snapshot = await response.json()
  if (!currentParticipantId || !snapshot.participants.some((participant) => participant.id === currentParticipantId)) {
    currentParticipantId = null
  }
  render(preserveDrafts)
  if (preserveDrafts) {
    showToast(completeMessage || 'Event data refreshed. Draft fields stayed unchanged.')
  }
  if (shouldShowDraftUpdateWarning(preserveDrafts, previousEventUpdatedAt)) {
    showDraftUpdateWarnings()
  }
}

function render(preserveDrafts) {
  if (!snapshot) return

  if (!app.dataset.ready) {
    app.innerHTML = shell()
    bindStaticHandlers()
    app.dataset.ready = 'true'
  }

  text('[data-event-title]', snapshot.event.title)
  text('[data-event-currency]', snapshot.event.currency)
  renderIdentity()
  renderParticipants(preserveDrafts)
  renderBalances()
  renderSuggestedSettlements()
  renderHistory()
  renderStartGuidance()
  renderPanelStates()
  fillParticipantSelects(preserveDrafts)
  renderIncludedParticipants(preserveDrafts)
  updateShareSummary()
  updateSettlementFocus()
}

function startRealtime() {
  if (!('WebSocket' in window)) {
    setRealtimeState('Live updates unavailable, polling')
    startFallbackPolling()
    return
  }
  connectRealtime()
}

function connectRealtime() {
  window.clearTimeout(realtimeReconnectId)
  setRealtimeState('Live updates connecting')
  const socket = new WebSocket(realtimeUrl())
  realtimeSocket = socket

  socket.addEventListener('open', () => {
    if (realtimeSocket !== socket) return
    realtimeReconnectAttempt = 0
    stopFallbackPolling()
    setRealtimeState('Live updates on')
  })

  socket.addEventListener('message', (event) => {
    handleRealtimeMessage(event.data)
  })

  socket.addEventListener('close', () => {
    if (realtimeSocket !== socket) return
    setRealtimeState('Live updates reconnecting, polling')
    startFallbackPolling()
    scheduleRealtimeReconnect()
  })

  socket.addEventListener('error', () => {
    socket.close()
  })
}

async function handleRealtimeMessage(data) {
  const message = parseEventRealtimeMessage(data)
  if (message) {
    await refresh(true, 'Event updated. Draft fields stayed unchanged.')
  }
}

function realtimeUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return protocol + '//' + window.location.host + eventRealtimeRoutePath(token)
}

function scheduleRealtimeReconnect() {
  realtimeReconnectAttempt += 1
  realtimeReconnectId = window.setTimeout(connectRealtime, eventRealtimeReconnectDelay(realtimeReconnectAttempt))
}

function startFallbackPolling() {
  if (fallbackPollingId) return
  fallbackPollingId = window.setInterval(() => refresh(true), eventRealtimeFallbackPollMs)
}

function stopFallbackPolling() {
  if (!fallbackPollingId) return
  window.clearInterval(fallbackPollingId)
  fallbackPollingId = null
}

function setRealtimeState(message) {
  const state = app.querySelector('[data-realtime-state]')
  if (state) state.textContent = message
}

function showToast(message) {
  const toast = app.querySelector('[data-toast-message]')
  if (!toast) return
  window.clearTimeout(toastHideId)
  toast.textContent = message
  toast.hidden = false
  toastHideId = window.setTimeout(() => {
    toast.hidden = true
  }, 2200)
}

function hasActiveDraft() {
  return expenseDraftDirty || settlementDraftDirty
}

function shouldShowDraftUpdateWarning(preserveDrafts, previousEventUpdatedAt) {
  return Boolean(
    preserveDrafts &&
    hasActiveDraft() &&
    previousEventUpdatedAt &&
    snapshot?.event?.updatedAt &&
    snapshot.event.updatedAt !== previousEventUpdatedAt
  )
}

function showDraftUpdateWarnings() {
  if (expenseDraftDirty) {
    const warning = app.querySelector('[data-expense-update-warning]')
    if (warning) {
      warning.textContent = 'Event updated while you were editing. Review before saving.'
    }
  }
  if (settlementDraftDirty) {
    const warning = app.querySelector('[data-settlement-update-warning]')
    if (warning) {
      warning.textContent = 'Event updated while you were editing. Review before saving.'
    }
  }
}

window.addEventListener('beforeunload', () => {
  if (realtimeSocket) {
    realtimeSocket.close(1000, 'Page closing')
  }
})
`}`
