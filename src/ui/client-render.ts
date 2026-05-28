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
    const paymentAction = balance.amountMinor < 0 ? '<button class="secondary" type="button" data-pay-balance="' + escapeAttr(participant.id) + '">Pay</button>' : ''
    return '<div class="ledger-row' + rowClass + '"><strong>' + escapeHtml(participant.displayName) + '</strong><span class="row-actions balance-actions">' + paymentAction + '<span class="amount ' + cls + '">' + phrase + '</span></span></div>'
  }).join('')
  balances.querySelectorAll('[data-pay-balance]').forEach((button) => button.addEventListener('click', payBalance))
}

function renderHistory() {
  const list = app.querySelector('[data-history]')
  const items = eventHistoryItems(snapshot)
  if (items.length === 0) {
    list.innerHTML = '<p class="empty">No Event history yet. Expenses and Settlement Payments will appear here.</p>'
    return
  }
  list.innerHTML = items.map((item) => {
    if (item.kind === 'expense') {
      const expense = item.record
      const payer = findParticipant(expense.payerParticipantId)
      const shares = expense.shares.map((share) => escapeHtml(findParticipant(share.participantId).displayName) + ' ' + money(share.amountMinor)).join(', ')
      return '<div class="ledger-row record-row"><div><span class="history-kind">Expense</span><h3>' + escapeHtml(expense.description) + '</h3><p class="subtle">' + escapeHtml(payer.displayName) + ' paid ' + money(expense.amountMinor) + ', ' + shares + '</p></div><span class="row-actions"><span class="amount">' + money(expense.amountMinor) + '</span><button class="secondary" type="button" data-edit-expense="' + expense.id + '">Edit</button><button class="danger" type="button" data-delete-expense="' + expense.id + '">Delete</button></span></div>'
    }
    const payment = item.record
    const sender = findParticipant(payment.senderParticipantId)
    const recipient = findParticipant(payment.recipientParticipantId)
    return '<div class="ledger-row record-row row-positive"><div><span class="history-kind">Settlement Payment</span><strong>' + escapeHtml(sender.displayName) + ' sent ' + escapeHtml(recipient.displayName) + '</strong><p class="subtle">Recorded Settlement Payment</p></div><span class="row-actions"><span class="amount amount-positive">' + money(payment.amountMinor) + '</span><button class="secondary" type="button" data-edit-payment="' + payment.id + '">Edit</button><button class="danger" type="button" data-delete-payment="' + payment.id + '">Delete</button></span></div>'
  }).join('')
  list.querySelectorAll('[data-edit-expense]').forEach((button) => button.addEventListener('click', editExpense))
  list.querySelectorAll('[data-delete-expense]').forEach((button) => button.addEventListener('click', deleteExpense))
  list.querySelectorAll('[data-edit-payment]').forEach((button) => button.addEventListener('click', editPayment))
  list.querySelectorAll('[data-delete-payment]').forEach((button) => button.addEventListener('click', deletePayment))
}

function renderPanelStates() {
  const actionState = composeEventPagePolicy(snapshot)
  const settlementSection = app.querySelector('[data-settlement-form-section]')
  if (settlementSection) {
    settlementSection.hidden = false
  }
  const settlementForm = app.querySelector('[data-settlement-form]')
  const manualSettlementButton = app.querySelector('[data-manual-settlement]')
  const settlementSubmit = app.querySelector('[data-settlement-form] button[type="submit"]')
  const settlementUnavailable = app.querySelector('[data-settlement-unavailable]')
  if (settlementForm) {
    settlementForm.hidden = !(manualSettlementOpen || settlementDraftDirty || settlementForm.settlementPaymentId.value)
  }
  if (manualSettlementButton) {
    manualSettlementButton.disabled = !actionState.settlementPaymentForm.canRecord
    manualSettlementButton.hidden = !settlementForm?.hidden
  }
  if (settlementSubmit) {
    settlementSubmit.disabled = !actionState.settlementPaymentForm.canRecord
  }
  if (settlementUnavailable) {
    settlementUnavailable.hidden = actionState.settlementPaymentForm.canRecord
    settlementUnavailable.textContent = actionState.settlementPaymentForm.disabledReason
  }
}

function renderStartGuidance() {
  const panel = app.querySelector('[data-start-guidance]')
  if (!panel) return

  const guidance = composeEventPagePolicy(snapshot).startGuidance

  panel.hidden = !guidance.visible
  panel.dataset.startTarget = guidance.target
  if (!guidance.visible) {
    return
  }
  text('[data-start-title]', guidance.title)
  text('[data-start-copy]', guidance.copy)
  text('[data-start-action]', guidance.action)
}

function fillParticipantSelects(preserve) {
  app.querySelectorAll('[data-participant-select]').forEach((select) => {
    const currentValue = preserve ? select.value : ''
    select.innerHTML = snapshot.participants.map(optionForParticipant).join('')
    select.value = currentValue || select.querySelector('option[value="' + currentParticipantId + '"]')?.value || snapshot.participants[0]?.id || ''
  })
  setExpensePayerFromDefault(preserve)
  const sender = app.querySelector('[name="suggestedSender"]')
  const recipient = app.querySelector('[name="suggestedRecipient"]')
  if (sender?.value) app.querySelector('[name="senderParticipantId"]').value = sender.value
  if (recipient?.value) app.querySelector('[name="recipientParticipantId"]').value = recipient.value
  if (!preserve) renderIncludedParticipants(false)
}

function renderIncludedParticipants(preserve) {
  const list = app.querySelector('[data-included-participants]')
  if (!list || !snapshot) return

  const previous = new Set(
    preserve
      ? Array.from(list.querySelectorAll('[name="includedParticipantId"]:checked')).map((input) => input.value)
      : []
  )
  const payerId = expensePayerParticipantId()
  const shouldUsePrevious = preserve && list.children.length > 0
  const defaultIncluded = new Set(shouldUsePrevious ? previous : snapshot.participants.map((participant) => participant.id))
  if (payerId && !shouldUsePrevious) {
    defaultIncluded.add(payerId)
  }

  list.innerHTML = snapshot.participants.map((participant) => {
    const participantNameId = 'participant-name-' + escapeAttr(participant.id)
    const status = isParticipantReferenced(participant.id) ? '<span class="chip">in use</span>' : ''
    const deleteButton = participantCanBeDeleted(participant.id) ? '<button class="danger" type="button" data-delete-participant="' + participant.id + '">Delete</button>' : ''
    return '<div class="ledger-row participant-row">' +
      '<label class="participant-split"><input type="checkbox" name="includedParticipantId" aria-label="Split with ' + escapeAttr(participant.displayName) + '" value="' + escapeAttr(participant.id) + '"' + (defaultIncluded.has(participant.id) ? ' checked' : '') + '></label>' +
      '<strong id="' + participantNameId + '">' + escapeHtml(participant.displayName) + '</strong>' +
      '<span class="row-actions participant-actions">' + status + '<button class="secondary" type="button" data-rename-participant="' + participant.id + '">Rename</button>' + deleteButton + '</span>' +
      '</div>'
  }).join('')
  list.querySelectorAll('[name="includedParticipantId"]').forEach((input) => {
    input.addEventListener('change', () => {
      markExpenseDirty()
      updateExpenseDraftState()
    })
  })
  list.querySelectorAll('[data-rename-participant]').forEach((button) => button.addEventListener('click', renameParticipant))
  list.querySelectorAll('[data-delete-participant]').forEach((button) => button.addEventListener('click', deleteParticipant))
  updateExpenseDraftState()
}

function findParticipant(id) {
  return snapshot.participants.find((participant) => participant.id === id) || { id, displayName: 'Unknown Participant' }
}

function participantCanBeDeleted(participantId) {
  return participantDeleteState(snapshot, participantId).canDelete
}

function isParticipantReferenced(participantId) {
  return isParticipantReferencedInSnapshot(snapshot, participantId)
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

function newParticipantId(previousSnapshot, nextSnapshot) {
  const previousIds = new Set((previousSnapshot?.participants || []).map((participant) => participant.id))
  return (nextSnapshot?.participants || []).find((participant) => !previousIds.has(participant.id))?.id || null
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
