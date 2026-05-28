export const clientTemplateScript = String.raw`
function shell() {
  return '<header class="app-top">' +
    '<div><div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span></span><span>SettleUp</span></div><h1 class="event-title-line"><span data-event-title></span><button class="icon-button" data-copy-link type="button" aria-label="Copy Event Link" title="Copy Event Link"><span class="copy-icon" aria-hidden="true"></span></button></h1><p class="subtle"><span data-event-currency></span>, Anyone with this link can edit.</p></div>' +
    '<div class="top-tools"><span class="chip chip-current" data-realtime-state>Live updates connecting</span></div>' +
    '</header>' +
    '<div class="toast-region" aria-live="polite" aria-atomic="true" data-toast-region><p class="toast-message" data-toast-message hidden></p></div>' +
    '<section class="start-panel" data-start-guidance hidden><div><strong data-start-title></strong><p class="subtle" data-start-copy></p></div><button type="button" data-start-action></button></section>' +
    '<div class="app-grid">' +
    '<section class="section balances-section" data-testid="balances-panel"><div class="section-head"><h2>Balances</h2><span class="amount amount-positive" data-outstanding></span></div><div data-balances></div><div class="settlement-dock" data-testid="record-settlement-panel" data-settlement-section data-settlement-form-section><div class="manual-settlement"><button class="secondary" type="button" data-manual-settlement>Manual Payment</button><p class="control-note" data-settlement-unavailable hidden></p></div>' + settlementForm() + '</div></section>' +
    '<section class="section" data-testid="add-expense-panel"><div class="section-head"><h2>Add Expense</h2><div class="expense-defaults" data-testid="expense-defaults"><span>Defaults</span><select data-current-participant aria-label="Expense defaults Participant"></select><button class="secondary" type="button" data-switch-participant>Switch</button></div></div>' + expenseForm() + '</section>' +
    '<section class="section" data-testid="event-history-panel"><div class="section-head"><h2>Event History</h2></div><div data-history></div></section>' +
    '</div>'
}

function expenseForm() {
  return '<form class="inline-form" data-expense-form>' +
    '<div class="form-grid expense-entry-row">' +
    '<label><span>Description</span><input type="text" name="description" required placeholder="Dinner"></label>' +
    '<label><span>Amount</span><input type="text" name="amount" inputmode="decimal" required placeholder="80.00"></label>' +
    '<button type="submit">Save</button>' +
    '</div>' +
    '<input type="hidden" name="expenseId">' +
    '<input type="hidden" name="payerParticipantId">' +
    '<fieldset class="included-panel"><legend>Participants</legend><div data-included-participants data-participants class="included-list"></div><p class="control-note" data-payer-warning hidden></p>' + participantManager() + '</fieldset>' +
    '<p class="control-note draft-warning" data-expense-update-warning aria-live="polite"></p>' +
    '<p class="error" data-expense-error hidden></p>' +
    '</form>'
}

function participantManager() {
  return '<div class="embedded-block participant-manager" data-participant-form><div class="inline-form compact-form participant-add-row"><label><span class="sr-only">Display name</span><input type="text" name="displayName" placeholder="Name"></label><button type="button" aria-label="Add Participant" data-add-participant>Add</button></div></div>'
}

function settlementForm(senderId, recipientId, amount) {
  return '<form class="inline-form settlement-form" data-settlement-form hidden>' +
    '<input type="hidden" name="settlementPaymentId">' +
    '<div class="settlement-party-row"><label><span>Sender</span><select name="senderParticipantId" data-participant-select></select></label>' +
    '<label><span>Recipient</span><select name="recipientParticipantId" data-participant-select></select></label></div>' +
    '<div class="settlement-action-row"><label><span class="sr-only">Amount</span><input type="text" name="amount" inputmode="decimal" aria-label="Amount" placeholder="24.00" value="' + escapeAttr(amount || '') + '"></label>' +
    '<button type="submit">Record</button><button class="secondary" type="button" data-cancel-settlement>Cancel</button></div>' +
    '<input type="hidden" name="suggestedSender" value="' + escapeAttr(senderId || '') + '">' +
    '<input type="hidden" name="suggestedRecipient" value="' + escapeAttr(recipientId || '') + '">' +
    '<p class="control-note draft-warning" data-settlement-update-warning aria-live="polite"></p>' +
    '<p class="error" data-settlement-error hidden></p>' +
    '</form>'
}
`
