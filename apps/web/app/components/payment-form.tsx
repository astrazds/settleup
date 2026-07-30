import type {
  SettlementPayment,
  SettlementSuggestion,
} from "@settleup/contracts";
import { useState } from "react";
import { Form, useNavigation } from "react-router";

import { EditConflict } from "./edit-conflict";
import { useEventContext } from "./event-context";
import { amountMinorToDecimal } from "../lib/money";
import {
  getParticipantPreference,
  setParticipantPreference,
} from "../lib/participant-preference";
import styles from "../styles/app.module.css";

interface PaymentFormProps {
  actionError?: string;
  payment?: SettlementPayment;
  submitLabel: string;
  suggestion?: SettlementSuggestion | null;
}

export function PaymentForm({
  actionError,
  payment,
  submitLabel,
  suggestion,
}: PaymentFormProps) {
  const { snapshot } = useEventContext();
  const navigation = useNavigation();
  const preferred = getParticipantPreference(
    snapshot.event,
    snapshot.participants,
  );
  const initialFrom =
    payment?.from ??
    suggestion?.from ??
    preferred ??
    snapshot.participants[0]?.id ??
    "";
  const initialTo =
    payment?.to ??
    suggestion?.to ??
    snapshot.participants.find((participant) => participant.id !== initialFrom)
      ?.id ??
    "";
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const isBusy = navigation.state !== "idle";
  const currentRevision = paymentRevision(payment);
  const [acceptedRevision, setAcceptedRevision] = useState(currentRevision);
  const [acceptedVersion, setAcceptedVersion] = useState(
    snapshot.event.version,
  );
  const [formKey, setFormKey] = useState(0);
  const hasConflict =
    currentRevision !== acceptedRevision ||
    snapshot.event.version !== acceptedVersion;

  return (
    <Form className={styles.form} key={formKey} method="post">
      <input name="currency" type="hidden" value={snapshot.event.currency} />
      <input
        name="eventVersion"
        type="hidden"
        value={acceptedVersion}
      />

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="from">
            From
          </label>
          <select
            className={styles.select}
            id="from"
            name="from"
            onChange={(event) => {
              const nextFrom = event.currentTarget.value;
              setFrom(nextFrom);
              setParticipantPreference(snapshot.event, nextFrom);
              if (nextFrom === to) {
                setTo(
                  snapshot.participants.find(
                    (participant) => participant.id !== nextFrom,
                  )?.id ?? "",
                );
              }
            }}
            required
            value={from}
          >
            {snapshot.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="to">
            To
          </label>
          <select
            className={styles.select}
            id="to"
            name="to"
            onChange={(event) => setTo(event.currentTarget.value)}
            required
            value={to}
          >
            <option disabled value="">
              Choose a person
            </option>
            {snapshot.participants
              .filter((participant) => participant.id !== from)
              .map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="amount">
          Amount
        </label>
        <input
          autoComplete="off"
          autoFocus
          className={styles.input}
          defaultValue={
            payment
              ? amountMinorToDecimal(payment.amountMinor, snapshot.event.currency)
              : suggestion
                ? amountMinorToDecimal(
                    suggestion.amountMinor,
                    snapshot.event.currency,
                  )
                : undefined
          }
          id="amount"
          inputMode="decimal"
          name="amount"
          placeholder="0.00"
          required
        />
        <p className={styles.hint}>
          This records a payment made elsewhere. SettleUp does not transfer money.
        </p>
      </div>

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
            setFrom(payment?.from ?? initialFrom);
            setTo(payment?.to ?? initialTo);
            setFormKey((value) => value + 1);
          }}
        />
      ) : null}

      {snapshot.participants.length < 2 ? (
        <p className={styles.formError} role="alert">
          Add another person before recording a payment.
        </p>
      ) : null}

      <div className={styles.dialogActions}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={
            isBusy || hasConflict || snapshot.participants.length < 2
          }
          type="submit"
        >
          {isBusy ? "Saving…" : submitLabel}
        </button>
      </div>
    </Form>
  );
}

function paymentRevision(payment: SettlementPayment | undefined): string {
  if (!payment) {
    return "new";
  }

  return JSON.stringify({
    amountMinor: payment.amountMinor,
    from: payment.from,
    to: payment.to,
  });
}
