export const clientBootstrapScript = String.raw`
const app = document.querySelector('#app')
const token = app?.dataset.token
let snapshot = null
let currentParticipantId = token ? localStorage.getItem('settleup:participant:' + token) : null
let pollingStarted = false

if (app && token) {
  boot()
}

async function boot() {
  await refresh(false)
  if (!pollingStarted) {
    pollingStarted = true
    window.setInterval(() => refresh(true), 8000)
  }
}

async function refresh(preserveDrafts) {
  const refreshNote = app.querySelector('[data-refresh-note]')
  if (preserveDrafts && refreshNote) {
    refreshNote.hidden = false
    refreshNote.textContent = 'Refreshing Event data...'
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
  const renderedRefreshNote = app.querySelector('[data-refresh-note]')
  if (preserveDrafts && renderedRefreshNote) {
    renderedRefreshNote.textContent = 'Event data refreshed. Draft fields stayed unchanged.'
    window.setTimeout(() => {
      renderedRefreshNote.hidden = true
    }, 1800)
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
  renderExpenses()
  renderSettlementPayments()
  fillParticipantSelects(preserveDrafts)
  updateShareSummary()
}
`
