export const clientActionsScript = String.raw`
function bindStaticHandlers() {
  app.querySelector('[data-copy-link]').addEventListener('click', async () => {
    await navigator.clipboard.writeText(window.location.href)
    showToast('Event Link copied')
  })
  app.querySelector('[data-start-action]').addEventListener('click', followStartGuidance)
  app.querySelector('[data-switch-participant]').addEventListener('click', () => {
    const select = app.querySelector('[data-current-participant]')
    currentParticipantId = select.value || null
    if (currentParticipantId) localStorage.setItem('settleup:participant:' + token, currentParticipantId)
    fillParticipantSelects(false)
    renderParticipants(true)
  })
  const participantForm = app.querySelector('[data-participant-form]')
  participantForm.querySelector('[data-add-participant]').addEventListener('click', (event) => {
    submitParticipant({ preventDefault: () => event.preventDefault(), currentTarget: participantForm })
  })
  participantForm.querySelector('[name="displayName"]').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submitParticipant({ preventDefault: () => undefined, currentTarget: participantForm })
  })
  const expenseForm = app.querySelector('[data-expense-form]')
  const settlementForm = app.querySelector('[data-settlement-form]')
  expenseForm.addEventListener('submit', submitExpense)
  settlementForm.addEventListener('submit', submitSettlementPayment)
  app.querySelector('[data-equal-split]').addEventListener('click', equalSplit)
  app.querySelector('[data-add-share]').addEventListener('click', () => {
    showExactShares()
    markExpenseDirty()
    addShareRow()
  })
  app.querySelector('[data-adjust-shares]').addEventListener('click', () => {
    showExactShares()
    markExpenseDirty()
  })
  app.querySelector('[data-assign-remaining]').addEventListener('click', assignRemaining)
  app.querySelector('[data-settlement-focus]').addEventListener('click', toggleSettlementFocus)
  app.querySelector('[data-copy-summary]').addEventListener('click', copySettlementSummary)
  expenseForm.amount.addEventListener('input', () => {
    markExpenseDirty()
    updateShareSummary()
  })
  expenseForm.description.addEventListener('input', markExpenseDirty)
  expenseForm.payerParticipantId.addEventListener('change', handlePayerChange)
  settlementForm.addEventListener('input', markSettlementDirty)
  settlementForm.addEventListener('change', markSettlementDirty)
}

async function submitParticipant(event) {
  event.preventDefault()
  const form = event.currentTarget
  const displayNameInput = form.querySelector('[name="displayName"]')
  const displayName = displayNameInput.value.trim()
  if (!displayName) return
  const previousSnapshot = snapshot
  const nextSnapshot = await post('/api/events/' + token + '/participants', { displayName })
  const addedParticipantId = newParticipantId(previousSnapshot, nextSnapshot)
  displayNameInput.value = ''
  snapshot = nextSnapshot
  render(true)
  includeParticipantInExpenseDraft(addedParticipantId)
}

async function submitExpense(event) {
  event.preventDefault()
  const form = event.currentTarget
  const exactSharesVisible = !app.querySelector('[data-exact-shares]').hidden
  const expenseAmountMinor = parseDraftMoneyMinor(form.amount.value)
  if (expenseAmountMinor === null || expenseAmountMinor <= 0) {
    showError('[data-expense-error]', 'Amount must be a positive decimal amount')
    return
  }
  const shares = exactSharesVisible ? exactSharePayload() : equalIncludedSharePayload(expenseAmountMinor)
  if (shares.length === 0) {
    showError('[data-expense-error]', 'Choose at least one Included Participant')
    return
  }
  if (!exactSharesVisible && shares.some((share) => share.amount === '')) {
    showError('[data-expense-error]', 'Amount is too small to split equally across the Included Participants')
    return
  }
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
    expenseDraftDirty = false
    app.querySelector('[data-share-list]').innerHTML = ''
    app.querySelector('[data-exact-shares]').hidden = true
    app.querySelector('[data-expense-update-warning]').textContent = ''
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
    settlementDraftDirty = false
    app.querySelector('[data-settlement-update-warning]').textContent = ''
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
  expenseDraftDirty = true
  app.querySelector('[data-exact-shares]').hidden = false
  renderIncludedParticipants(false)
  for (const input of Array.from(app.querySelectorAll('[name="includedParticipantId"]'))) {
    input.checked = expense.shares.some((share) => share.participantId === input.value)
  }
  const list = app.querySelector('[data-share-list]')
  list.innerHTML = ''
  for (const share of expense.shares) {
    addShareRow(share.participantId, String((share.amountMinor / 100).toFixed(2)))
  }
  syncAssignRemainingOptions()
  updateShareSummary()
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
  settlementDraftDirty = true
  form.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function deletePayment(event) {
  await del('/api/events/' + token + '/settlement-payments/' + event.currentTarget.dataset.deletePayment)
  await refresh(false)
}

function recordSuggestion(event) {
  activeSuggestionKey = event.currentTarget.dataset.recordSuggestion
  renderSuggestedSettlements()
}

function cancelSuggestion() {
  activeSuggestionKey = null
  renderSuggestedSettlements()
}

async function confirmSuggestion(event) {
  const row = event.currentTarget.closest('.suggestion')
  const error = row.querySelector('[data-suggestion-error]')
  const [senderParticipantId, recipientParticipantId] = event.currentTarget.dataset.confirmSuggestion.split('|')
  const amount = row.querySelector('[data-suggestion-amount]').value
  try {
    await post('/api/events/' + token + '/settlement-payments', {
      senderParticipantId,
      recipientParticipantId,
      amount
    })
    activeSuggestionKey = null
    await refresh(false)
  } catch (caught) {
    error.textContent = caught.message
    error.hidden = false
  }
}

function equalSplit() {
  const amountText = app.querySelector('[data-expense-form]').amount.value
  const amountMinor = parseDraftMoneyMinor(amountText) || 0
  const selected = includedParticipants()
  const list = app.querySelector('[data-share-list]')
  list.innerHTML = ''
  for (const share of equalShares(amountMinor, selected)) {
    const amount = share.amountMinor
    const participant = findParticipant(share.participantId)
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
  row.querySelector('input').addEventListener('input', markExpenseDirty)
  row.querySelector('select').addEventListener('change', markExpenseDirty)
  row.querySelector('button').addEventListener('click', () => {
    markExpenseDirty()
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

  const shareAmounts = Array.from(app.querySelectorAll('[name="shareAmount"]')).map((input) => input.value)
  const shareSummary = draftShareSummary(form.amount.value, shareAmounts)

  text('[data-share-total]', money(shareSummary.totalMinor))
  text('[data-share-assigned]', money(shareSummary.assignedMinor))
  text('[data-share-remaining]', money(shareSummary.remainingMinor))
  summary.classList.toggle('error-state', shareSummary.hasInvalidDraftMoney || shareSummary.remainingMinor !== 0)
  syncAssignRemainingOptions()
  updateIncludedState(shareSummary.totalMinor)
}

function markExpenseDirty() {
  expenseDraftDirty = true
  app.querySelector('[data-expense-update-warning]').textContent = ''
}

function markSettlementDirty() {
  settlementDraftDirty = true
  app.querySelector('[data-settlement-update-warning]').textContent = ''
}

function handlePayerChange() {
  markExpenseDirty()
  const payerId = app.querySelector('[data-expense-form]').payerParticipantId.value
  const payerInput = app.querySelector('[name="includedParticipantId"][value="' + cssEscape(payerId) + '"]')
  if (payerInput) {
    payerInput.checked = true
  }
  syncExactSharesFromIncluded()
  updateShareSummary()
}

function showExactShares() {
  const panel = app.querySelector('[data-exact-shares]')
  if (!panel.hidden) return
  panel.hidden = false
  syncExactSharesFromIncluded()
  updateShareSummary()
}

function exactSharePayload() {
  return Array.from(app.querySelectorAll('[data-share-row]')).map((row) => ({
    participantId: row.querySelector('[name="shareParticipantId"]').value,
    amount: row.querySelector('[name="shareAmount"]').value
  }))
}

function equalIncludedSharePayload(amountMinor) {
  return equalShares(amountMinor, includedParticipants()).map((share) => ({
    participantId: share.participantId,
    amount: formatDraftMoneyMinor(share.amountMinor)
  }))
}

function includedParticipants() {
  const includedIds = new Set(Array.from(app.querySelectorAll('[name="includedParticipantId"]:checked')).map((input) => input.value))
  return snapshot.participants.filter((participant) => includedIds.has(participant.id))
}

function syncExactSharesFromIncluded() {
  if (app.querySelector('[data-exact-shares]').hidden) {
    updateEqualShareResult()
    return
  }
  const list = app.querySelector('[data-share-list]')
  const amountText = app.querySelector('[data-expense-form]').amount.value
  const syncedShares = syncDraftSharesFromIncluded(amountText, includedParticipants(), exactSharePayload())
  list.innerHTML = ''
  for (const share of syncedShares) {
    addShareRow(share.participantId, share.amount)
  }
}

function updateEqualShareResult() {
  const result = app.querySelector('[data-equal-share-result]')
  const amountMinor = parseDraftMoneyMinor(app.querySelector('[data-expense-form]').amount.value)
  const included = includedParticipants()
  if (!result) return
  if (!amountMinor || included.length === 0) {
    result.textContent = 'Choose Included Participants to preview the equal split.'
    return
  }
  const shares = equalShares(amountMinor, included)
  const hasZeroShare = shares.some((share) => share.amountMinor <= 0)
  result.textContent = hasZeroShare
    ? 'Amount is too small to split equally across every Included Participant.'
    : 'Equal split: ' + shares.map((share) => findParticipant(share.participantId).displayName + ' ' + money(share.amountMinor)).join(', ')
}

function updateIncludedState(totalMinor) {
  const included = includedParticipants()
  const payerId = app.querySelector('[data-expense-form]').payerParticipantId.value
  const payerWarning = app.querySelector('[data-payer-warning]')
  const saveButton = app.querySelector('[data-expense-form] button[type="submit"]')
  const hasIncluded = included.length > 0
  const equalDraftShares = totalMinor > 0 ? equalShares(totalMinor, included) : []
  const hasZeroShare = equalDraftShares.some((share) => share.amountMinor <= 0)

  if (payerWarning) {
    const warning = payerWarningMessage(payerId, included, snapshot.participants)
    payerWarning.hidden = warning === ''
    payerWarning.textContent = warning
  }
  if (saveButton) {
    saveButton.disabled = !hasIncluded || (app.querySelector('[data-exact-shares]').hidden && hasZeroShare)
  }
  updateEqualShareResult()
}

function syncAssignRemainingOptions() {
  const select = app.querySelector('[data-assign-remaining-participant]')
  if (!select || !snapshot) return
  const current = select.value
  const participants = includedParticipants()
  select.innerHTML = participants.map(optionForParticipant).join('')
  select.value = participants.some((participant) => participant.id === current) ? current : participants[0]?.id || ''
}

function assignRemaining() {
  markExpenseDirty()
  const selectedId = app.querySelector('[data-assign-remaining-participant]').value
  if (!selectedId) return
  const remaining = remainingShareAmount()
  const assignment = assignRemainingToDraftShare(exactSharePayload(), selectedId, remaining)
  if (!assignment.ok) {
    showError('[data-expense-error]', assignment.message)
    return
  }
  const row = Array.from(app.querySelectorAll('[data-share-row]')).find((candidate) =>
    candidate.querySelector('[name="shareParticipantId"]').value === selectedId
  )
  if (!row) return
  const input = row.querySelector('[name="shareAmount"]')
  input.value = assignment.shares.find((share) => share.participantId === selectedId)?.amount || input.value
  updateShareSummary()
}

function remainingShareAmount() {
  const amountText = app.querySelector('[data-expense-form]').amount.value
  const shareAmounts = Array.from(app.querySelectorAll('[name="shareAmount"]')).map((input) => input.value)
  return draftShareSummary(amountText, shareAmounts).remainingMinor
}

function toggleSettlementFocus() {
  settlementFocus = !settlementFocus
  updateSettlementFocus()
  renderSuggestedSettlements()
}

async function copySettlementSummary() {
  const lines = snapshot.suggestedSettlements.map((suggestion) => {
    return findParticipant(suggestion.senderParticipantId).displayName + ' sends ' + findParticipant(suggestion.recipientParticipantId).displayName + ' ' + money(suggestion.amountMinor)
  })
  await navigator.clipboard.writeText(lines.length > 0 ? lines.join('\n') : 'Everyone is settled.')
  showToast('Summary copied')
}

function includeParticipantInExpenseDraft(participantId) {
  if (!participantId) return
  const input = app.querySelector('[name="includedParticipantId"][value="' + cssEscape(participantId) + '"]')
  if (!input) return
  input.checked = true
  syncExactSharesFromIncluded()
  updateShareSummary()
}

function followStartGuidance() {
  const targetSelector = app.querySelector('[data-start-guidance]').dataset.startTarget
  const target = targetSelector ? app.querySelector(targetSelector) : null
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const focusTarget = target?.querySelector('input, select, button')
  focusTarget?.focus({ preventScroll: true })
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value)
  return String(value).replace(/"/g, '\\"')
}
`
