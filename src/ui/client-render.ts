export const clientRenderScript = String.raw`
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
