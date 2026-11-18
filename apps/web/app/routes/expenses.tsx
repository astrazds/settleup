import type { CurrencyCode, Expense } from "@settleup/contracts";
import { useId, useMemo, useState } from "react";
import { useFetcher, useOutlet } from "react-router";

import { DeleteConfirm } from "../components/delete-confirm";
import { ExpenseForm } from "../components/expense-form";
import { useEventContext } from "../components/event-context";
import { EditIcon } from "../components/icons";
import { RouteDialogLink } from "../components/route-dialog-link";
import { actionErrorMessage, deleteExpense } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import { formatMoney } from "../lib/money";
import styles from "../styles/app.module.css";
import slip from "../styles/expense-slip.module.css";
import type { clientAction as createExpenseAction } from "./expense-new";
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

function ExpenseSplit({ expense, currency, names }: {
  expense: Expense;
  currency: CurrencyCode;
  names: ReadonlyMap<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className={styles.shareDetails} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={styles.shareSummary}>See exact split</summary>
      {open && (
        <ul className={styles.shareBreakdown}>
          {expense.shares.map((share) => (
            <li key={share.participantId}>
              <span>{names.get(share.participantId) ?? "Unknown person"}</span>
              <strong>{formatMoney(share.amountMinor, currency)}</strong>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function QuickSlip() {
  const fetcherKey = useId();
  const fetcher = useFetcher<typeof createExpenseAction>({ key: fetcherKey });
  const [editedSinceSave, setEditedSinceSave] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number>();
  const result = fetcher.data;
  const saved = result && "savedVersion" in result ? result : undefined;

  if (saved && saved.savedVersion !== savedVersion) {
    setSavedVersion(saved.savedVersion);
    setEditedSinceSave(false);
  }

  return (
    <section aria-labelledby="add-expense-heading" className={slip.paper}>
      <h2 className={styles.sectionTitle} id="add-expense-heading">Add expense</h2>
      <ExpenseForm
        actionFailure={result && "kind" in result ? result : undefined}
        inline={{
          fetcherKey,
          busy: fetcher.state !== "idle",
          onChange: () => setEditedSinceSave(true),
        }}
        key={savedVersion}
        submitLabel="Save expense"
      />
      <p className={slip.saved} role="status">
        {saved && !editedSinceSave ? `${saved.description} saved.` : ""}
      </p>
    </section>
  );
}

export default function Expenses() {
  const { snapshot } = useEventContext();
  const fetcher = useFetcher<typeof clientAction>();
  const names = useMemo(
    () => new Map(snapshot.participants.map((person) => [person.id, person.name])),
    [snapshot.participants],
  );
  const outlet = useOutlet();

  return (
    <>
      <h2 className={styles.visuallyHidden}>Expenses</h2>
      <div className={slip.workspace}>
        <div hidden={Boolean(outlet)}>
          <QuickSlip key={snapshot.event.id} />
        </div>
        {snapshot.expenses.length > 0 ? (
          <section aria-labelledby="expense-list-heading" className={slip.ledger}>
            <h3 className={styles.sectionTitle} id="expense-list-heading">
              Recent activity
            </h3>
            {fetcher.data && "error" in fetcher.data ? (
              <p aria-live="polite" className={styles.formError} role="alert">
                {fetcher.data.error}
              </p>
            ) : null}
            <ul className={styles.list}>
              {snapshot.expenses.map((expense) => {
                const payer = names.get(expense.payerId) ?? "Unknown person";
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
                      <ExpenseSplit expense={expense} currency={snapshot.event.currency} names={names} />
                    </div>
                    <span className={styles.listAmount}>
                      {formatMoney(expense.amountMinor, snapshot.event.currency)}
                    </span>
                    <div className={styles.itemActions}>
                      <RouteDialogLink
                        aria-label={`Edit ${expense.description}`}
                        className={styles.iconButton}
                        title={`Edit ${expense.description}`}
                        to={`${expense.id}/edit`}
                      >
                        <EditIcon />
                        <span aria-hidden="true" className={styles.actionLabel}>
                          Edit
                        </span>
                      </RouteDialogLink>
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
        ) : (
          <section className={slip.ledger}>
            <h3 className={styles.sectionTitle}>Nothing to split yet</h3>
            <p className={styles.hint}>Your first shared cost will appear here.</p>
          </section>
        )}
      </div>
      {outlet}
    </>
  );
}
