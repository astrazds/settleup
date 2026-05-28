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
    setExpensePayerFromDefault(false)
    fillParticipantSelects(true)
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
  app.querySelector('[data-manual-settlement]').addEventListener('click', openManualSettlementForm)
  app.querySelector('[data-cancel-settlement]').addEventListener('click', cancelSettlementPaymentDraft)
  expenseForm.amount.addEventListener('input', () => {
    markExpenseDirty()
    updateExpenseDraftState()
  })
  expenseForm.description.addEventListener('input', markExpenseDirty)
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
  const expenseAmountMinor = parseDraftMoneyMinor(form.amount.value)
  if (expenseAmountMinor === null || expenseAmountMinor <= 0) {
    showError('[data-expense-error]', 'Amount must be a positive decimal amount')
    return
  }
  const included = includedParticipants()
  const equalSharesPreview = equalShares(expenseAmountMinor, included)
  if (included.length === 0) {
    showError('[data-expense-error]', 'Choose at least one Participant to split between')
    return
  }
  if (equalSharesPreview.some((share) => share.amountMinor <= 0)) {
    showError('[data-expense-error]', 'Amount is too small to split equally across the selected Participants')
    return
  }
  try {
    const payload = {
      description: form.description.value,
      amount: form.amount.value,
      payerParticipantId: expensePayerParticipantId(),
      includedParticipantIds: included.map((participant) => participant.id)
    }
    if (form.expenseId.value) {
      await patch('/api/events/' + token + '/expenses/' + form.expenseId.value, payload)
    } else {
      await post('/api/events/' + token + '/expenses', payload)
    }
    form.reset()
    expenseDraftDirty = false
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
    manualSettlementOpen = false
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
  currentParticipantId = expense.payerParticipantId
  localStorage.setItem('settleup:participant:' + token, currentParticipantId)
  renderIdentity()
  setExpensePayerParticipantId(expense.payerParticipantId)
  expenseDraftDirty = true
  renderIncludedParticipants(false)
  for (const input of Array.from(app.querySelectorAll('[name="includedParticipantId"]'))) {
    input.checked = expense.shares.some((share) => share.participantId === input.value)
  }
  updateExpenseDraftState()
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
  manualSettlementOpen = true
  renderPanelStates()
  form.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function deletePayment(event) {
  await del('/api/events/' + token + '/settlement-payments/' + event.currentTarget.dataset.deletePayment)
  await refresh(false)
}

async function payBalance(event) {
  const button = event.currentTarget
  const senderParticipantId = button.dataset.payBalance
  const payments = snapshot.suggestedSettlements.filter((suggestion) => suggestion.senderParticipantId === senderParticipantId)
  if (payments.length === 0) {
    showToast('Nothing to pay')
    return
  }
  button.disabled = true
  try {
    for (const payment of payments) {
      await post('/api/events/' + token + '/settlement-payments', {
        senderParticipantId: payment.senderParticipantId,
        recipientParticipantId: payment.recipientParticipantId,
        amount: formatDraftMoneyMinor(payment.amountMinor)
      })
    }
    await refresh(false)
  } catch (error) {
    button.disabled = false
    window.alert(error.message)
  }
}

function updateExpenseDraftState() {
  const form = app.querySelector('[data-expense-form]')
  if (!form || !snapshot) return
  updateIncludedState()
}

function markExpenseDirty() {
  expenseDraftDirty = true
  app.querySelector('[data-expense-update-warning]').textContent = ''
}

function markSettlementDirty() {
  settlementDraftDirty = true
  app.querySelector('[data-settlement-update-warning]').textContent = ''
}

function expensePayerParticipantId() {
  const form = app.querySelector('[data-expense-form]')
  return form?.payerParticipantId?.value || currentParticipantId || snapshot.participants[0]?.id || ''
}

function setExpensePayerParticipantId(participantId) {
  const form = app.querySelector('[data-expense-form]')
  if (!form?.payerParticipantId) return
  form.payerParticipantId.value = participantId || currentParticipantId || snapshot.participants[0]?.id || ''
}

function setExpensePayerFromDefault(preserve) {
  const currentPayerId = expensePayerParticipantId()
  const preservedPayerStillExists = snapshot?.participants?.some((participant) => participant.id === currentPayerId)
  if (preserve && preservedPayerStillExists) return
  setExpensePayerParticipantId(currentParticipantId || snapshot.participants[0]?.id || '')
  syncExpensePayerWithIncluded()
}

function syncExpensePayerWithIncluded() {
  const payerId = expensePayerParticipantId()
  const payerInput = app.querySelector('[name="includedParticipantId"][value="' + cssEscape(payerId) + '"]')
  if (payerInput) {
    payerInput.checked = true
  }
  updateExpenseDraftState()
}

function includedParticipants() {
  const includedIds = new Set(Array.from(app.querySelectorAll('[name="includedParticipantId"]:checked')).map((input) => input.value))
  return snapshot.participants.filter((participant) => includedIds.has(participant.id))
}

function updateIncludedState() {
  const included = includedParticipants()
  const payerId = expensePayerParticipantId()
  const payerWarning = app.querySelector('[data-payer-warning]')
  const saveButton = app.querySelector('[data-expense-form] button[type="submit"]')
  const hasIncluded = included.length > 0
  const totalMinor = parseDraftMoneyMinor(app.querySelector('[data-expense-form]').amount.value) || 0
  const equalDraftShares = totalMinor > 0 ? equalShares(totalMinor, included) : []
  const hasZeroShare = equalDraftShares.some((share) => share.amountMinor <= 0)

  if (payerWarning) {
    const warning = payerWarningMessage(payerId, included, snapshot.participants)
    payerWarning.hidden = warning === ''
    payerWarning.textContent = warning
  }
  if (saveButton) {
    saveButton.disabled = !hasIncluded || hasZeroShare
  }
}

function openManualSettlementForm() {
  manualSettlementOpen = true
  renderPanelStates()
  const form = app.querySelector('[data-settlement-form]')
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  form.querySelector('[name="amount"]').focus({ preventScroll: true })
}

function cancelSettlementPaymentDraft() {
  const form = app.querySelector('[data-settlement-form]')
  form.reset()
  manualSettlementOpen = false
  settlementDraftDirty = false
  app.querySelector('[data-settlement-update-warning]').textContent = ''
  app.querySelector('[data-settlement-error]').hidden = true
  renderPanelStates()
}

function includeParticipantInExpenseDraft(participantId) {
  if (!participantId) return
  const input = app.querySelector('[name="includedParticipantId"][value="' + cssEscape(participantId) + '"]')
  if (!input) return
  input.checked = true
  updateExpenseDraftState()
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
