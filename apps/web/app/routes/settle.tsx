import { Link, Outlet, useFetcher } from "react-router";

import { DeleteConfirm } from "../components/dialog";
import { EmptyState } from "../components/empty-state";
import {
  actionErrorMessage,
  initials,
  participantName,
  useEventContext,
} from "../components/event-context";
import { CheckIcon, EditIcon, PlusIcon, ReceiptIcon, SettleIcon } from "../components/icons";
import { deletePayment } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import { formatMoney } from "../lib/money";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/settle";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const paymentId = readFormString(formData, "paymentId");

  try {
    await deletePayment(params.token ?? "", paymentId, {
      expectedVersion: readFormVersion(formData),
    });
    return { ok: true as const };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

function paymentDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
      }).format(date);
}

export default function Settle() {
  const context = useEventContext();
  const { snapshot } = context;
  const fetcher = useFetcher<typeof clientAction>();
  const suggestion = snapshot.settlementSuggestion;
  const hasExpenses = snapshot.expenses.length > 0;

  return (
    <>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderCopy}>
            <h2 className={styles.pageTitle}>Settle up</h2>
            <p className={styles.pageIntro}>
              One clear next step, based on every expense and recorded payment.
            </p>
          </div>
        </div>

        {!hasExpenses ? (
          <EmptyState
            action={
              <Link
                className={`${styles.button} ${styles.buttonPrimary}`}
                to="../expenses/new"
              >
                <PlusIcon />
                Add an expense
              </Link>
            }
            icon={<ReceiptIcon />}
            text="Balances and settlement suggestions will appear once the first shared cost is added."
            title="Add expenses first"
          />
        ) : suggestion ? (
          <section aria-labelledby="next-payment-heading" className={styles.settlementCard}>
            <div>
              <p className={styles.settlementLabel}>Next suggested payment</p>
              <h3 className={styles.settlementText} id="next-payment-heading">
                {participantName(snapshot, suggestion.from)} pays{" "}
                {participantName(snapshot, suggestion.to)}{" "}
                {formatMoney(suggestion.amountMinor, snapshot.event.currency)}
              </h3>
              <p className={styles.settlementNote}>
                SettleUp suggests the simplest next step. Payment happens outside
                this app.
              </p>
            </div>
            <div>
              <Link
                className={`${styles.button} ${styles.buttonPrimary}`}
                to="new"
              >
                <CheckIcon />
                Record payment
              </Link>
            </div>
          </section>
        ) : (
          <section aria-label="Everyone is settled" className={styles.settledCard}>
            <span
              aria-hidden="true"
              className={`${styles.emptyIcon} ${styles.settledIcon} ${styles.positive}`}
            >
              <CheckIcon />
            </span>
            <h3 className={styles.settledTitle}>Everyone is settled</h3>
            <p className={styles.hint}>Every balance is back to zero.</p>
          </section>
        )}

        {hasExpenses ? (
          <section aria-labelledby="balances-heading" className={styles.section}>
            <h3 className={styles.sectionTitle} id="balances-heading">
              Current balances
            </h3>
            <ul className={styles.balanceList}>
              {snapshot.balances.map((balance) => {
                const name = participantName(snapshot, balance.participantId);
                const isPositive = balance.netMinor > 0;
                const isNegative = balance.netMinor < 0;
                const balanceText = isPositive
                  ? `gets back ${formatMoney(balance.netMinor, snapshot.event.currency)}`
                  : isNegative
                    ? `owes ${formatMoney(Math.abs(balance.netMinor), snapshot.event.currency)}`
                    : "is settled";

                return (
                  <li
                    aria-label={`${name} ${balanceText}`}
                    className={styles.balanceRow}
                    key={balance.participantId}
                  >
                    <span aria-hidden="true" className={styles.avatar}>
                      {initials(name)}
                    </span>
                    <span className={styles.balanceName}>{name}</span>
                    <span
                      aria-hidden="true"
                      className={`${styles.balanceValue} ${
                        isPositive
                          ? styles.positive
                          : isNegative
                            ? styles.negative
                            : styles.muted
                      }`}
                    >
                      {isPositive
                        ? `+${formatMoney(balance.netMinor, snapshot.event.currency)}`
                        : isNegative
                          ? `−${formatMoney(Math.abs(balance.netMinor), snapshot.event.currency)}`
                          : "Settled"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {fetcher.data && "error" in fetcher.data ? (
          <p aria-live="polite" className={styles.formError} role="alert">
            {fetcher.data.error}
          </p>
        ) : null}

        {snapshot.payments.length > 0 ? (
          <section aria-labelledby="payments-heading" className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle} id="payments-heading">
                Recorded payments
              </h3>
              <Link className={styles.textButton} to="new">
                Add another
              </Link>
            </div>
            <ul className={styles.list}>
              {snapshot.payments.map((payment) => {
                const from = participantName(snapshot, payment.from);
                const to = participantName(snapshot, payment.to);
                return (
                  <li className={styles.listItem} key={payment.id}>
                    <div
                      aria-hidden="true"
                      className={`${styles.avatar} ${styles.entryMark}`}
                    >
                      <SettleIcon height="18" width="18" />
                    </div>
                    <div className={styles.listMain}>
                      <div className={styles.listTitleRow}>
                        <p className={styles.listTitle}>
                          {from} → {to}
                        </p>
                      </div>
                      <p className={styles.listMeta}>
                        Recorded
                        {paymentDate(payment.createdAt)
                          ? ` · ${paymentDate(payment.createdAt)}`
                          : ""}
                      </p>
                    </div>
                    <span className={styles.listAmount}>
                      {formatMoney(payment.amountMinor, snapshot.event.currency)}
                    </span>
                    <div className={styles.itemActions}>
                      <Link
                        aria-label={`Edit payment from ${from} to ${to}`}
                        className={styles.iconButton}
                        title={`Edit payment from ${from} to ${to}`}
                        to={`${payment.id}/edit`}
                      >
                        <EditIcon />
                      </Link>
                      <DeleteConfirm
                        description={`This removes the recorded payment from ${from} to ${to} and recalculates balances.`}
                        disabled={fetcher.state !== "idle"}
                        disabledReason="Another payment change is still being saved."
                        itemLabel={`payment from ${from} to ${to}`}
                        onConfirm={() => {
                          void fetcher.submit(
                            {
                              eventVersion: snapshot.event.version.toString(),
                              paymentId: payment.id,
                            },
                            { method: "post" },
                          );
                        }}
                        title="Delete this payment?"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
      <Outlet context={context} />
    </>
  );
}
