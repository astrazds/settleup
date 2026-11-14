import { Link, Outlet, useFetcher } from "react-router";

import { DeleteConfirm } from "../components/delete-confirm";
import { EmptyState } from "../components/empty-state";
import { useEventContext } from "../components/event-context";
import { EditIcon, PlusIcon, ReceiptIcon } from "../components/icons";
import { actionErrorMessage, deleteExpense } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import { formatMoney } from "../lib/money";
import { participantName } from "../lib/participants";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/expenses";

const expenseDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const expenseId = readFormString(formData, "expenseId");

  try {
    await deleteExpense(params.token ?? "", expenseId, {
      expectedVersion: readFormVersion(formData),
    });
    return { ok: true as const };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

function expenseDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : expenseDateFormatter.format(date);
}

export default function Expenses() {
  const { snapshot } = useEventContext();
  const fetcher = useFetcher<typeof clientAction>();
  const totalMinor = snapshot.expenses.reduce(
    (total, expense) => total + BigInt(expense.amountMinor),
    0n,
  );

  return (
    <>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderCopy}>
            <h2 className={styles.visuallyHidden}>Expenses</h2>
            {snapshot.expenses.length > 0 ? (
              <p className={styles.total}>
                <strong>{formatMoney(totalMinor, snapshot.event.currency)}</strong>{" "}
                <span>total spent</span>
              </p>
            ) : null}
          </div>
          {snapshot.expenses.length > 0 ? (
            <Link
              className={`${styles.button} ${styles.buttonPrimary}`}
              to="new"
            >
              <PlusIcon />
              <span>Add expense</span>
            </Link>
          ) : null}
        </div>

        {snapshot.expenses.length > 0 ? (
          <>
            {fetcher.data && "error" in fetcher.data ? (
              <p aria-live="polite" className={styles.formError} role="alert">
                {fetcher.data.error}
              </p>
            ) : null}

            <section aria-labelledby="expense-list-heading" className={styles.section}>
              <h3 className={styles.visuallyHidden} id="expense-list-heading">
                Recent activity
              </h3>
              <ul className={styles.list}>
                {snapshot.expenses.map((expense) => {
                  const payer = participantName(snapshot, expense.payerId);
                  const peopleCount = expense.shares.length;
                  const dateLabel = expenseDate(expense.createdAt);
                  return (
                    <li className={styles.listItem} key={expense.id}>
                      <div className={styles.listMain}>
                        <p className={styles.listTitle}>{expense.description}</p>
                        <p className={styles.listMeta}>
                          {payer} paid · split {peopleCount === 1 ? "with 1 person" : `with ${peopleCount} people`}
                          {dateLabel ? ` · ${dateLabel}` : ""}
                        </p>
                        <details className={styles.shareDetails}>
                          <summary className={styles.shareSummary}>
                            See exact split
                          </summary>
                          <ul className={styles.shareBreakdown}>
                            {expense.shares.map((share) => (
                              <li key={share.participantId}>
                                <span>
                                  {participantName(
                                    snapshot,
                                    share.participantId,
                                  )}
                                </span>
                                <strong>
                                  {formatMoney(
                                    share.amountMinor,
                                    snapshot.event.currency,
                                  )}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                      <span className={styles.listAmount}>
                        {formatMoney(expense.amountMinor, snapshot.event.currency)}
                      </span>
                      <div className={styles.itemActions}>
                        <Link
                          aria-label={`Edit ${expense.description}`}
                          className={styles.iconButton}
                          title={`Edit ${expense.description}`}
                          to={`${expense.id}/edit`}
                        >
                          <EditIcon />
                          <span aria-hidden="true" className={styles.actionLabel}>
                            Edit
                          </span>
                        </Link>
                        <DeleteConfirm
                          description={`This permanently removes “${expense.description}” and recalculates everyone's balances.`}
                          disabled={fetcher.state !== "idle"}
                          disabledReason="Another expense change is still being saved."
                          itemLabel={expense.description}
                          onConfirm={() => {
                            void fetcher.submit(
                              {
                                eventVersion: snapshot.event.version.toString(),
                                expenseId: expense.id,
                              },
                              { method: "post" },
                            );
                          }}
                          title="Delete this expense?"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : (
          <EmptyState
            action={
              <Link
                className={`${styles.button} ${styles.buttonPrimary}`}
                to="new"
              >
                <PlusIcon />
                Add the first expense
              </Link>
            }
            icon={<ReceiptIcon />}
            text="Add a shared cost to see exact splits and balances."
            title="Nothing to split yet"
          />
        )}
      </div>
      <Outlet />
    </>
  );
}
