export const clientScript = String.raw`
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

function shell() {
  return '<header class="app-top">' +
    '<div><div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span></span><span>SettleUp</span></div><h1 data-event-title></h1><p class="subtle"><span data-event-currency></span>, Anyone with this link can view and edit.</p></div>' +
    '<div class="actions"><button class="secondary" data-copy-link type="button">Copy Event Link</button></div>' +
    '</header>' +
    '<p class="refresh-note" data-refresh-note hidden>Refreshing Event data...</p>' +
    '<div class="identity-bar"><strong>Expense defaults</strong><select data-current-participant aria-label="Expense defaults Participant"></select><button class="secondary" type="button" data-switch-participant>Switch</button></div>' +
    '<div class="app-grid"><div class="column-stack">' +
    '<section class="section"><div class="section-head"><h2>Balances</h2><span class="amount amount-positive" data-outstanding></span></div><div data-balances></div></section>' +
    '<section class="section"><div class="section-head"><h2>Add Expense</h2></div>' + expenseForm() + '</section>' +
    '<section class="section"><div class="section-head"><h2>Expenses</h2></div><div data-expenses></div></section>' +
    '</div><aside class="column-stack">' +
    '<section class="section"><div class="section-head"><h2>Suggested Settlements</h2><span class="chip chip-pending" data-suggestion-count></span></div><div data-suggestions></div></section>' +
    '<section class="section"><div class="section-head"><h2>Participants</h2></div><form class="inline-form" data-participant-form><label><span>Display name</span><input type="text" name="displayName" required></label><button type="submit">Add Participant</button></form><div data-participants></div></section>' +
    '<section class="section"><div class="section-head"><h2>Record Settlement Payment</h2></div>' + settlementForm() + '</section>' +
    '<section class="section"><div class="section-head"><h2>Settlement Payments</h2></div><div data-payments></div></section>' +
    '</aside></div>'
}

function expenseForm() {
  return '<form class="inline-form" data-expense-form>' +
    '<div class="form-grid">' +
    '<label><span>Description</span><input type="text" name="description" required placeholder="Dinner"></label>' +
    '<label><span>Amount</span><input type="text" name="amount" inputmode="decimal" required placeholder="80.00"></label>' +
    '<label><span>Payer</span><select name="payerParticipantId" data-participant-select></select></label>' +
    '</div>' +
    '<input type="hidden" name="expenseId">' +
    '<div data-share-list class="share-list"></div>' +
    '<div class="share-summary" data-share-summary>' +
    '<div><span>Total</span><strong data-share-total>$0.00</strong></div>' +
    '<div><span>Assigned</span><strong data-share-assigned>$0.00</strong></div>' +
    '<div><span>Remaining</span><strong data-share-remaining>$0.00</strong></div>' +
    '<button class="secondary" type="button" data-equal-split>Equal split</button>' +
    '</div>' +
    '<div class="actions"><button class="secondary" type="button" data-add-share>Add custom Share</button></div>' +
    '<p class="error" data-expense-error hidden></p>' +
    '<button type="submit">Save Expense</button>' +
    '</form>'
}

function settlementForm(senderId, recipientId, amount) {
  return '<form class="inline-form" data-settlement-form>' +
    '<input type="hidden" name="settlementPaymentId">' +
    '<label><span>Sender</span><select name="senderParticipantId" data-participant-select></select></label>' +
    '<label><span>Recipient</span><select name="recipientParticipantId" data-participant-select></select></label>' +
    '<label><span>Amount</span><input type="text" name="amount" inputmode="decimal" placeholder="24.00" value="' + escapeAttr(amount || '') + '"></label>' +
    '<input type="hidden" name="suggestedSender" value="' + escapeAttr(senderId || '') + '">' +
    '<input type="hidden" name="suggestedRecipient" value="' + escapeAttr(recipientId || '') + '">' +
    '<p class="error" data-settlement-error hidden></p>' +
    '<button type="submit">Record Settlement Payment</button>' +
    '</form>'
}

function bindStaticHandlers() {
  app.querySelector('[data-copy-link]').addEventListener('click', async () => {
    await navigator.clipboard.writeText(window.location.href)
    const button = app.querySelector('[data-copy-link]')
    button.textContent = 'Event Link copied'
    window.setTimeout(() => {
      button.textContent = 'Copy Event Link'
    }, 1800)
  })
  app.querySelector('[data-switch-participant]').addEventListener('click', () => {
    const select = app.querySelector('[data-current-participant]')
    currentParticipantId = select.value || null
    if (currentParticipantId) localStorage.setItem('settleup:participant:' + token, currentParticipantId)
    fillParticipantSelects(false)
    renderParticipants(true)
  })
  app.querySelector('[data-participant-form]').addEventListener('submit', submitParticipant)
  app.querySelector('[data-expense-form]').addEventListener('submit', submitExpense)
  app.querySelector('[data-settlement-form]').addEventListener('submit', submitSettlementPayment)
  app.querySelector('[data-equal-split]').addEventListener('click', equalSplit)
  app.querySelector('[data-add-share]').addEventListener('click', () => addShareRow())
  app.querySelector('[data-expense-form]').amount.addEventListener('input', updateShareSummary)
}

function renderIdentity() {
  const select = app.querySelector('[data-current-participant]')
  select.innerHTML = snapshot.participants.map(optionForParticipant).join('')
  select.value = currentParticipantId || snapshot.participants[0]?.id || ''
  if (!currentParticipantId && select.value) {
    currentParticipantId = select.value
    localStorage.setItem('settleup:participant:' + token, currentParticipantId)
  }
}

function renderParticipants(preserveDrafts) {
  const list = app.querySelector('[data-participants]')
  list.innerHTML = snapshot.participants.map((participant) =>
    '<div class="ledger-row"><strong>' + escapeHtml(participant.displayName) + '</strong><span class="row-actions">' +
    (participant.id === currentParticipantId ? '<span class="chip chip-current">defaults</span>' : '') +
    '<button class="secondary" type="button" data-rename-participant="' + participant.id + '">Rename</button>' +
    '<button class="danger" type="button" data-delete-participant="' + participant.id + '">Delete</button>' +
    '</span></div>'
  ).join('')
  list.querySelectorAll('[data-rename-participant]').forEach((button) => button.addEventListener('click', renameParticipant))
  list.querySelectorAll('[data-delete-participant]').forEach((button) => button.addEventListener('click', deleteParticipant))
  if (!preserveDrafts && app.querySelector('[data-share-list]').children.length === 0) {
    equalSplit()
  }
}

function renderBalances() {
  const balances = app.querySelector('[data-balances]')
  const outstanding = snapshot.balances.reduce((total, balance) => total + Math.max(balance.amountMinor, 0), 0)
  const outstandingElement = app.querySelector('[data-outstanding]')
  outstandingElement.textContent = outstanding > 0 ? 'Outstanding ' + money(outstanding) : ''
  balances.innerHTML = snapshot.balances.map((balance) => {
    const participant = findParticipant(balance.participantId)
    const cls = balance.amountMinor > 0 ? 'amount-positive' : balance.amountMinor < 0 ? 'amount-negative' : 'amount-zero'
    const rowClass = balance.amountMinor > 0 ? ' row-positive' : balance.amountMinor < 0 ? ' row-negative' : ''
    const phrase = balance.amountMinor > 0 ? 'is owed ' + money(balance.amountMinor) : balance.amountMinor < 0 ? 'owes ' + money(Math.abs(balance.amountMinor)) : 'is settled'
    return '<div class="ledger-row' + rowClass + '"><strong>' + escapeHtml(participant.displayName) + '</strong><span class="amount ' + cls + '">' + phrase + '</span></div>'
  }).join('')
}

function renderSuggestedSettlements() {
  const list = app.querySelector('[data-suggestions]')
  const count = app.querySelector('[data-suggestion-count]')
  count.textContent = snapshot.suggestedSettlements.length > 0 ? snapshot.suggestedSettlements.length + ' payments' : ''
  if (snapshot.suggestedSettlements.length === 0) {
    list.innerHTML = '<p class="empty">Everyone is settled.</p>'
    return
  }
  list.innerHTML = snapshot.suggestedSettlements.map((suggestion) => {
    const sender = findParticipant(suggestion.senderParticipantId)
    const recipient = findParticipant(suggestion.recipientParticipantId)
    return '<div class="ledger-row suggestion"><div><strong>' + escapeHtml(sender.displayName) + ' sends ' + escapeHtml(recipient.displayName) + '</strong><p class="subtle">Record when money moves.</p></div><span class="amount">' + money(suggestion.amountMinor) + '</span><button type="button" data-record-suggestion="' + suggestion.senderParticipantId + '|' + suggestion.recipientParticipantId + '|' + suggestion.amountMinor + '">Record</button></div>'
  }).join('')
  list.querySelectorAll('[data-record-suggestion]').forEach((button) => button.addEventListener('click', recordSuggestion))
}

function renderExpenses() {
  const list = app.querySelector('[data-expenses]')
  if (snapshot.expenses.length === 0) {
    list.innerHTML = '<p class="empty">No Expenses yet.</p>'
    return
  }
  list.innerHTML = snapshot.expenses.map((expense) => {
    const payer = findParticipant(expense.payerParticipantId)
    const shares = expense.shares.map((share) => escapeHtml(findParticipant(share.participantId).displayName) + ' ' + money(share.amountMinor)).join(', ')
    return '<div class="ledger-row record-row"><div><h3>' + escapeHtml(expense.description) + '</h3><p class="subtle">' + escapeHtml(payer.displayName) + ' paid ' + money(expense.amountMinor) + ', ' + shares + '</p></div><span class="row-actions"><span class="amount">' + money(expense.amountMinor) + '</span><button class="secondary" type="button" data-edit-expense="' + expense.id + '">Edit</button><button class="danger" type="button" data-delete-expense="' + expense.id + '">Delete</button></span></div>'
  }).join('')
  list.querySelectorAll('[data-edit-expense]').forEach((button) => button.addEventListener('click', editExpense))
  list.querySelectorAll('[data-delete-expense]').forEach((button) => button.addEventListener('click', deleteExpense))
}

function renderSettlementPayments() {
  const list = app.querySelector('[data-payments]')
  if (snapshot.settlementPayments.length === 0) {
    list.innerHTML = '<p class="empty">No Settlement Payments recorded.</p>'
    return
  }
  list.innerHTML = snapshot.settlementPayments.map((payment) => {
    const sender = findParticipant(payment.senderParticipantId)
    const recipient = findParticipant(payment.recipientParticipantId)
    return '<div class="ledger-row record-row row-positive"><div><strong>' + escapeHtml(sender.displayName) + ' sent ' + escapeHtml(recipient.displayName) + '</strong><p class="subtle">Recorded Settlement Payment</p></div><span class="row-actions"><span class="amount amount-positive">' + money(payment.amountMinor) + '</span><button class="secondary" type="button" data-edit-payment="' + payment.id + '">Edit</button><button class="danger" type="button" data-delete-payment="' + payment.id + '">Delete</button></span></div>'
  }).join('')
  list.querySelectorAll('[data-edit-payment]').forEach((button) => button.addEventListener('click', editPayment))
  list.querySelectorAll('[data-delete-payment]').forEach((button) => button.addEventListener('click', deletePayment))
}

function fillParticipantSelects(preserve) {
  app.querySelectorAll('[data-participant-select]').forEach((select) => {
    const currentValue = preserve ? select.value : ''
    select.innerHTML = snapshot.participants.map(optionForParticipant).join('')
    select.value = currentValue || select.querySelector('option[value="' + currentParticipantId + '"]')?.value || snapshot.participants[0]?.id || ''
  })
  const sender = app.querySelector('[name="suggestedSender"]')
  const recipient = app.querySelector('[name="suggestedRecipient"]')
  if (sender?.value) app.querySelector('[name="senderParticipantId"]').value = sender.value
  if (recipient?.value) app.querySelector('[name="recipientParticipantId"]').value = recipient.value
  if (!preserve && app.querySelector('[data-share-list]').children.length === 0) equalSplit()
}

async function submitParticipant(event) {
  event.preventDefault()
  const form = event.currentTarget
  await post('/api/events/' + token + '/participants', { displayName: form.displayName.value })
  form.reset()
  await refresh(false)
}

async function submitExpense(event) {
  event.preventDefault()
  const form = event.currentTarget
  const shares = Array.from(app.querySelectorAll('[data-share-row]')).map((row) => ({
    participantId: row.querySelector('[name="shareParticipantId"]').value,
    amount: row.querySelector('[name="shareAmount"]').value
  }))
  try {
    const payload = {
      description: form.description.value,
      amount: form.amount.value,
      payerParticipantId: form.payerParticipantId.value,
      shares
    }
    if (form.expenseId.value) {
      await patch('/api/events/' + token + '/expenses/' + form.expenseId.value, payload)
    } else {
      await post('/api/events/' + token + '/expenses', payload)
    }
    form.reset()
    app.querySelector('[data-share-list]').innerHTML = ''
    await refresh(false)
  } catch (error) {
    showError('[data-expense-error]', error.message)
  }
}

async function submitSettlementPayment(event) {
  event.preventDefault()
  const form = event.currentTarget
  try {
    const payload = {
      senderParticipantId: form.senderParticipantId.value,
      recipientParticipantId: form.recipientParticipantId.value,
      amount: form.amount.value
    }
    if (form.settlementPaymentId.value) {
      await patch('/api/events/' + token + '/settlement-payments/' + form.settlementPaymentId.value, payload)
    } else {
      await post('/api/events/' + token + '/settlement-payments', payload)
    }
    form.reset()
    await refresh(false)
  } catch (error) {
    showError('[data-settlement-error]', error.message)
  }
}

async function renameParticipant(event) {
  const participant = findParticipant(event.currentTarget.dataset.renameParticipant)
  const displayName = window.prompt('Participant display name', participant.displayName)
  if (!displayName) return
  await patch('/api/events/' + token + '/participants/' + participant.id, { displayName })
  await refresh(false)
}

async function deleteParticipant(event) {
  try {
    await del('/api/events/' + token + '/participants/' + event.currentTarget.dataset.deleteParticipant)
    await refresh(false)
  } catch (error) {
    window.alert(error.message)
  }
}

function editExpense(event) {
  const expense = snapshot.expenses.find((candidate) => candidate.id === event.currentTarget.dataset.editExpense)
  if (!expense) return
  const form = app.querySelector('[data-expense-form]')
  form.expenseId.value = expense.id
  form.description.value = expense.description
  form.amount.value = String((expense.amountMinor / 100).toFixed(2))
  form.payerParticipantId.value = expense.payerParticipantId
  const list = app.querySelector('[data-share-list]')
  list.innerHTML = ''
  for (const share of expense.shares) {
    addShareRow(share.participantId, String((share.amountMinor / 100).toFixed(2)))
  }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function deleteExpense(event) {
  await del('/api/events/' + token + '/expenses/' + event.currentTarget.dataset.deleteExpense)
  await refresh(false)
}

function editPayment(event) {
  const payment = snapshot.settlementPayments.find((candidate) => candidate.id === event.currentTarget.dataset.editPayment)
  if (!payment) return
  const form = app.querySelector('[data-settlement-form]')
  form.settlementPaymentId.value = payment.id
  form.senderParticipantId.value = payment.senderParticipantId
  form.recipientParticipantId.value = payment.recipientParticipantId
  form.amount.value = String((payment.amountMinor / 100).toFixed(2))
  form.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function deletePayment(event) {
  await del('/api/events/' + token + '/settlement-payments/' + event.currentTarget.dataset.deletePayment)
  await refresh(false)
}

function recordSuggestion(event) {
  const [sender, recipient, amountMinor] = event.currentTarget.dataset.recordSuggestion.split('|')
  const form = app.querySelector('[data-settlement-form]')
  form.senderParticipantId.value = sender
  form.recipientParticipantId.value = recipient
  form.amount.value = String(Number(amountMinor) / 100)
}

function equalSplit() {
  const amountText = app.querySelector('[data-expense-form]').amount.value
  const amountMinor = Math.round(Number(amountText || 0) * 100)
  const selected = snapshot.participants
  const list = app.querySelector('[data-share-list]')
  list.innerHTML = ''
  const base = selected.length > 0 ? Math.floor(amountMinor / selected.length) : 0
  let remainder = selected.length > 0 ? amountMinor - base * selected.length : 0
  for (const participant of selected) {
    const amount = base + (remainder > 0 ? 1 : 0)
    remainder -= 1
    addShareRow(participant.id, amount > 0 ? String((amount / 100).toFixed(2)) : '')
  }
  updateShareSummary()
}

function addShareRow(participantId, amount) {
  const list = app.querySelector('[data-share-list]')
  const row = document.createElement('div')
  row.className = 'share-row'
  row.dataset.shareRow = 'true'
  row.innerHTML = '<label><span>Participant</span><select name="shareParticipantId">' + snapshot.participants.map(optionForParticipant).join('') + '</select></label><label><span>Share</span><input type="text" name="shareAmount" inputmode="decimal" value="' + escapeAttr(amount || '') + '"></label><button class="secondary" type="button">Remove</button>'
  row.querySelector('select').value = participantId || currentParticipantId || snapshot.participants[0]?.id || ''
  row.querySelector('input').addEventListener('input', updateShareSummary)
  row.querySelector('button').addEventListener('click', () => {
    row.remove()
    updateShareSummary()
  })
  list.append(row)
  updateShareSummary()
}

function updateShareSummary() {
  const form = app.querySelector('[data-expense-form]')
  const summary = app.querySelector('[data-share-summary]')
  if (!form || !summary || !snapshot) return

  const totalMinor = parseAmountMinor(form.amount.value)
  const assignedMinor = Array.from(app.querySelectorAll('[name="shareAmount"]')).reduce(
    (total, input) => total + parseAmountMinor(input.value),
    0
  )
  const remainingMinor = totalMinor - assignedMinor

  text('[data-share-total]', money(totalMinor))
  text('[data-share-assigned]', money(assignedMinor))
  text('[data-share-remaining]', money(remainingMinor))
  summary.classList.toggle('error-state', remainingMinor !== 0)
}

function parseAmountMinor(value) {
  const amount = Number(String(value || '').trim())
  if (!Number.isFinite(amount)) {
    return 0
  }
  return Math.round(amount * 100)
}

async function post(path, body) {
  return request(path, 'POST', body)
}

async function patch(path, body) {
  return request(path, 'PATCH', body)
}

async function del(path) {
  return request(path, 'DELETE')
}

async function request(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new Error(payload.error?.message || 'Request failed')
  }
  return response.json().catch(() => null)
}

function findParticipant(id) {
  return snapshot.participants.find((participant) => participant.id === id) || { id, displayName: 'Unknown Participant' }
}

function optionForParticipant(participant) {
  return '<option value="' + escapeAttr(participant.id) + '">' + escapeHtml(participant.displayName) + '</option>'
}

function money(amountMinor) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: snapshot.event.currency
  }).format(amountMinor / 100)
}

function text(selector, value) {
  const element = app.querySelector(selector)
  if (element) element.textContent = value
}

function showError(selector, message) {
  const element = app.querySelector(selector)
  element.textContent = message
  element.hidden = false
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value)
}
`
