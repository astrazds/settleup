export const clientTemplateScript = String.raw`
function shell() {
  return '<header class="app-top">' +
    '<div><div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span></span><span>SettleUp</span></div><h1 data-event-title></h1><p class="subtle"><span data-event-currency></span>, Anyone with this link can view and edit.</p></div>' +
    '<div class="actions"><span class="chip chip-current" data-realtime-state>Live updates connecting</span><button class="secondary" data-copy-link type="button">Copy Event Link</button></div>' +
    '</header>' +
    '<p class="refresh-note" data-refresh-note hidden>Refreshing Event data...</p>' +
    '<div class="identity-bar"><strong>Expense defaults</strong><select data-current-participant aria-label="Expense defaults Participant"></select><button class="secondary" type="button" data-switch-participant>Switch</button></div>' +
    '<p class="refresh-note" data-empty-event-guidance hidden>Add Participants before the first shared Expense so SettleUp can split costs clearly.</p>' +
    '<div class="app-grid"><div class="column-stack">' +
    '<section class="section"><div class="section-head"><h2>Balances</h2><span class="amount amount-positive" data-outstanding></span></div><div data-balances></div></section>' +
    '<section class="section"><div class="section-head"><h2>Add Expense</h2></div>' + expenseForm() + '</section>' +
    '<section class="section"><div class="section-head"><h2>Expenses</h2></div><div data-expenses></div></section>' +
    '</div><aside class="column-stack">' +
    '<section class="section" data-settlement-section><div class="section-head"><h2>Suggested Settlements</h2><span class="row-actions"><button class="secondary" type="button" data-copy-summary hidden>Copy summary</button><button class="secondary" type="button" data-settlement-focus>Settle up</button><span class="chip chip-pending" data-suggestion-count></span></span></div><div data-suggestions></div></section>' +
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
    '<fieldset class="included-panel"><legend>Included Participants</legend><p class="subtle">Choose who has a Share on this Expense.</p><div data-included-participants class="included-list"></div><p class="control-note" data-payer-warning hidden></p></fieldset>' +
    '<div class="actions"><button class="secondary" type="button" data-adjust-shares>Adjust Shares</button></div>' +
    '<div data-exact-shares hidden>' +
    '<div data-share-list class="share-list"></div>' +
    '<div class="share-summary" data-share-summary>' +
    '<div><span>Total</span><strong data-share-total>$0.00</strong></div>' +
    '<div><span>Assigned</span><strong data-share-assigned>$0.00</strong></div>' +
    '<div><span>Remaining</span><strong data-share-remaining>$0.00</strong></div>' +
    '<button class="secondary" type="button" data-equal-split>Equal split</button>' +
    '</div>' +
    '<div class="actions assign-remaining"><label><span>Assign remaining to</span><select data-assign-remaining-participant></select></label><button class="secondary" type="button" data-assign-remaining>Assign remaining</button><button class="secondary" type="button" data-add-share>Add custom Share</button></div>' +
    '</div>' +
    '<p class="success-note" data-equal-share-result></p>' +
    '<p class="control-note" data-expense-update-warning hidden></p>' +
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
    '<p class="control-note" data-settlement-update-warning hidden></p>' +
    '<p class="error" data-settlement-error hidden></p>' +
    '<button type="submit">Record Settlement Payment</button>' +
    '</form>'
}
`
