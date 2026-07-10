import React from "react";
import { Check, Fuel, ReceiptText, Trash2, Undo2, Utensils, WalletCards } from "lucide-react";

import { ActionButton, DecorativeIcon } from "./design-system.jsx";

const iconByExpense = {
  groceries: ReceiptText,
  fuel: Fuel,
  dinner: Utensils,
};

export function ExpenseIcon({ type, className = "" }) {
  const Icon = iconByExpense[type] ?? ReceiptText;
  return (
    <span className={`expense-icon ${className}`.trim()}>
      <DecorativeIcon icon={Icon} size={19} />
    </span>
  );
}

export function BalanceRow({
  className = "",
  description,
  label,
  participant,
  currentParticipantId,
  tone,
  value,
}) {
  const isEmpty = !participant;
  const isPositive = tone === "positive";

  return (
    <article className={`balance-row ${isEmpty ? "balance-row-empty" : ""} ${className}`.trim()}>
      <div className="balance-name">
        <strong>
          {label ?? participant?.name}
          {participant?.id === currentParticipantId ? <span className="you-tag">You</span> : null}
        </strong>
        <span>{description}</span>
      </div>
      {participant ? (
        <div className={`balance-value ${isPositive ? "positive" : "negative"}`}>
          <strong>
            {isPositive ? "+" : "-"}
            {value}
          </strong>
          <span>{isPositive ? "gets back" : "pays"}</span>
        </div>
      ) : null}
    </article>
  );
}

export function SettlementPrompt({ money, settlementSuggestion, onRecord }) {
  return (
    <aside className="settle-prompt" aria-label="Next payment">
      <div className="next-payment-copy">
        <span>Next payment</span>
        <strong>
          {settlementSuggestion
            ? `${settlementSuggestion.from.name} pays ${settlementSuggestion.to.name}`
            : "Everyone is settled"}
        </strong>
      </div>
      {settlementSuggestion ? (
        <ActionButton className="settle-toggle" onClick={onRecord}>
          <DecorativeIcon icon={WalletCards} size={16} />
          Record {money(settlementSuggestion.amountMinor)}
        </ActionButton>
      ) : null}
    </aside>
  );
}

export function PaymentConfirmation({
  amount,
  from,
  money,
  onUndo,
  statusRef,
  to,
}) {
  if (!from || !to) {
    return null;
  }

  return (
    <div className="payment-confirmation" role="status" tabIndex={-1} ref={statusRef}>
      <DecorativeIcon icon={Check} size={17} />
      <div>
        <strong>
          Recorded: {from.name} paid {to.name} {money(amount)}
        </strong>
        <span>Everyone with the link will see the updated payment status.</span>
      </div>
      <button type="button" onClick={onUndo}>
        <DecorativeIcon icon={Undo2} size={15} />
        Undo payment
      </button>
    </div>
  );
}

export function RemoveConfirmation({ expense, money, onKeep, onRemove }) {
  return (
    <div className="remove-confirmation" role="alert">
      <div>
        <strong>
          Remove {expense.description} ({money(expense.amountMinor)})?
        </strong>
        <span>This will change what everyone with the link sees.</span>
      </div>
      <div className="remove-confirmation-actions">
        <button type="button" onClick={onKeep}>
          Keep expense
        </button>
        <button className="danger-action" type="button" onClick={onRemove}>
          <DecorativeIcon icon={Trash2} size={15} />
          Remove expense
        </button>
      </div>
    </div>
  );
}

export function UndoToast({ expense, money, onUndo }) {
  if (!expense) {
    return null;
  }

  return (
    <div className="undo-toast" role="status">
      <span>
        Removed {expense.description} ({money(expense.amountMinor)})
      </span>
      <button type="button" onClick={onUndo}>
        <DecorativeIcon icon={Undo2} size={15} />
        Undo
      </button>
    </div>
  );
}
