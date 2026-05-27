export const clientActionsScript = String.raw`
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
  form.amount.value = formatDraftMoneyMinor(Number(amountMinor))
}

function equalSplit() {
  const amountText = app.querySelector('[data-expense-form]').amount.value
  const amountMinor = parseDraftMoneyMinor(amountText) || 0
  const selected = snapshot.participants
  const list = app.querySelector('[data-share-list]')
  list.innerHTML = ''
  const base = selected.length > 0 ? Math.floor(amountMinor / selected.length) : 0
  let remainder = selected.length > 0 ? amountMinor - base * selected.length : 0
  for (const participant of selected) {
    const amount = base + (remainder > 0 ? 1 : 0)
    remainder -= 1
    addShareRow(participant.id, amount > 0 ? formatDraftMoneyMinor(amount) : '')
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

  const totalInput = form.amount.value.trim()
  const parsedTotalMinor = totalInput ? parseDraftMoneyMinor(totalInput) : 0
  let hasInvalidDraftMoney = totalInput !== '' && parsedTotalMinor === null
  let assignedMinor = 0
  for (const input of Array.from(app.querySelectorAll('[name="shareAmount"]'))) {
    const shareInput = input.value.trim()
    const parsedShareMinor = shareInput ? parseDraftMoneyMinor(shareInput) : 0
    hasInvalidDraftMoney = hasInvalidDraftMoney || (shareInput !== '' && parsedShareMinor === null)
    assignedMinor += parsedShareMinor || 0
  }
  const totalMinor = parsedTotalMinor || 0
  const remainingMinor = (totalMinor || 0) - assignedMinor

  text('[data-share-total]', money(totalMinor))
  text('[data-share-assigned]', money(assignedMinor))
  text('[data-share-remaining]', money(remainingMinor))
  summary.classList.toggle('error-state', hasInvalidDraftMoney || remainingMinor !== 0)
}
`
