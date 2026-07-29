import type { Expense } from "@settleup/contracts";
import { useState } from "react";
import { Form, useNavigation } from "react-router";

import { CheckIcon } from "./icons";
import { EditConflict } from "./edit-conflict";
import { useEventContext } from "./event-context";
import {
  getParticipantPreference,
  setParticipantPreference,
} from "../lib/participant-preference";
import {
  amountMinorToDecimal,
  formatMoney,
  parseAmountMinor,
  splitAmountMinorEqually,
} from "../lib/money";
import styles from "../styles/app.module.css";

interface ExpenseFormProps {
  actionError?: string;
  expense?: Expense;
  submitLabel: string;
}

export function ExpenseForm({ actionError, expense, submitLabel }: ExpenseFormProps) {
  const { snapshot } = useEventContext();
  const navigation = useNavigation();
  const isBusy = navigation.state !== "idle";
  const currentRevision = expenseRevision(expense);
  const [acceptedRevision, setAcceptedRevision] = useState(currentRevision);
  const [acceptedVersion, setAcceptedVersion] = useState(
    snapshot.event.version,
  );
  const [formKey, setFormKey] = useState(0);
  const currentAmount = expense
    ? amountMinorToDecimal(expense.amountMinor, snapshot.event.currency)
    : "";
  const currentIncludedIds = expense
    ? expense.shares.map((share) => share.participantId)
    : snapshot.participants.map((participant) => participant.id);
  const [amountInput, setAmountInput] = useState(currentAmount);
  const [includedIds, setIncludedIds] = useState(currentIncludedIds);
  const hasConflict =
    currentRevision !== acceptedRevision ||
    snapshot.event.version !== acceptedVersion;
  const included = new Set(includedIds);
  const selectedParticipants = snapshot.participants.filter((participant) =>
    included.has(participant.id),
  );
  const preview = expenseSharePreview(
    amountInput,
    snapshot.event.currency,
    selectedParticipants.length,
  );
  const preferredPayer = getParticipantPreference(
    snapshot.event,
    snapshot.participants,
  );
  const defaultPayer =
    expense?.payerId ??
    (preferredPayer &&
    snapshot.participants.some((participant) => participant.id === preferredPayer)
      ? preferredPayer
      : snapshot.participants[0]?.id);

  return (
    <Form className={styles.form} key={formKey} method="post">
      <input name="currency" type="hidden" value={snapshot.event.currency} />
      <input
        name="eventVersion"
        type="hidden"
        value={acceptedVersion}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="description">
          What was it?
        </label>
        <input
          autoComplete="off"
          autoFocus
          className={styles.input}
          defaultValue={expense?.description}
          id="description"
          maxLength={160}
          name="description"
          placeholder="Dinner"
          required
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="amount">
            Amount
          </label>
          <input
            autoComplete="off"
            aria-describedby={preview.error ? "amount-preview-error" : undefined}
            aria-invalid={preview.error ? true : undefined}
            className={styles.input}
            id="amount"
            inputMode="decimal"
            name="amount"
            onChange={(event) => setAmountInput(event.currentTarget.value)}
            placeholder="0.00"
            required
            value={amountInput}
          />
          {preview.error ? (
            <p className={styles.fieldError} id="amount-preview-error">
              {preview.error}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="payerId">
            Paid by
          </label>
          <select
            className={styles.select}
            defaultValue={defaultPayer}
            id="payerId"
            name="payerId"
            onChange={(event) => {
              setParticipantPreference(snapshot.event, event.currentTarget.value);
            }}
            required
          >
            {snapshot.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset
        aria-describedby={
          includedIds.length === 0 ? "split-selection-error" : undefined
        }
        aria-invalid={includedIds.length === 0 ? true : undefined}
        className={styles.field}
      >
        <legend className={styles.label}>Split equally between</legend>
        <p className={styles.hint}>The server divides every cent exactly.</p>
        <ul className={styles.checkList}>
          {snapshot.participants.map((participant) => {
            const inputId = `included-${participant.id}`;
            return (
              <li className={styles.checkRow} key={participant.id}>
                <input
                  checked={included.has(participant.id)}
                  className={styles.checkInput}
                  id={inputId}
                  name="includedParticipantIds"
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setIncludedIds((current) =>
                      checked
                        ? [...current, participant.id]
                        : current.filter((id) => id !== participant.id),
                    );
                  }}
                  type="checkbox"
                  value={participant.id}
                />
                <label className={styles.checkLabel} htmlFor={inputId}>
                  <span className={styles.checkMark}>
                    <CheckIcon height="15" width="15" />
                  </span>
                  <span className={styles.checkName}>{participant.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {includedIds.length === 0 ? (
          <p className={styles.fieldError} id="split-selection-error">
            Choose at least one person.
          </p>
        ) : null}
      </fieldset>

      {preview.amounts.length > 0 ? (
        <section aria-label="Exact split preview" className={styles.sharePreview}>
          <h3 className={styles.sharePreviewTitle}>Exact split</h3>
          <ul className={styles.sharePreviewList}>
            {selectedParticipants.map((participant, index) => (
              <li key={participant.id}>
                <span>{participant.name}</span>
                <strong>
                  {formatMoney(
                    preview.amounts[index] ?? 0,
                    snapshot.event.currency,
                  )}
                </strong>
              </li>
            ))}
          </ul>
          {preview.hasRemainder ? (
            <p className={styles.hint}>
              Leftover cents are assigned from top to bottom so the total stays
              exact.
            </p>
          ) : null}
        </section>
      ) : null}

      {actionError ? (
        <p aria-live="polite" className={styles.formError} role="alert">
          {actionError}
        </p>
      ) : null}

      {hasConflict ? (
        <EditConflict
          onReload={() => {
            setAcceptedRevision(currentRevision);
            setAcceptedVersion(snapshot.event.version);
            setAmountInput(currentAmount);
            setIncludedIds(currentIncludedIds);
            setFormKey((value) => value + 1);
          }}
        />
      ) : null}

      <div className={styles.dialogActions}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={
            isBusy ||
            hasConflict ||
            includedIds.length === 0 ||
            Boolean(preview.error)
          }
          type="submit"
        >
          {isBusy ? "Saving…" : submitLabel}
        </button>
      </div>
    </Form>
  );
}

function expenseSharePreview(
  input: string,
  currency: Parameters<typeof parseAmountMinor>[1],
  participantCount: number,
): { amounts: number[]; error?: string; hasRemainder: boolean } {
  if (!input.trim() || participantCount === 0) {
    return { amounts: [], hasRemainder: false };
  }

  try {
    const amountMinor = parseAmountMinor(input, currency);
    return {
      amounts: splitAmountMinorEqually(amountMinor, participantCount),
      hasRemainder: amountMinor % participantCount !== 0,
    };
  } catch (error) {
    return {
      amounts: [],
      error: error instanceof Error ? error.message : "Enter a valid amount.",
      hasRemainder: false,
    };
  }
}

function expenseRevision(expense: Expense | undefined): string {
  if (!expense) {
    return "new";
  }

  return JSON.stringify({
    amountMinor: expense.amountMinor,
    description: expense.description,
    payerId: expense.payerId,
    shares: expense.shares,
  });
}
