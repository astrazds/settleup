import { redirect, useActionData } from "react-router";

import { RouteDialog } from "../components/dialog";
import { actionErrorMessage, useEventContext } from "../components/event-context";
import { ExpenseForm } from "../components/expense-form";
import { updateExpense } from "../lib/api";
import {
  readFormCurrency,
  readFormString,
  readFormStrings,
  readFormVersion,
} from "../lib/form-data";
import { parseAmountMinor } from "../lib/money";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/expense-edit";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    await updateExpense(
      token,
      params.expenseId ?? "",
      {
        description: readFormString(formData, "description"),
        amountMinor: parseAmountMinor(
          readFormString(formData, "amount"),
          readFormCurrency(formData),
        ),
        payerId: readFormString(formData, "payerId"),
        includedParticipantIds: readFormStrings(
          formData,
          "includedParticipantIds",
        ),
      },
      {
        expectedVersion: readFormVersion(formData),
      },
    );
    return redirect(`/e/${encodeURIComponent(token)}/expenses`);
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export default function EditExpense({ params }: Route.ComponentProps) {
  const { snapshot } = useEventContext();
  const actionData = useActionData<typeof clientAction>();
  const expense = snapshot.expenses.find((item) => item.id === params.expenseId);

  return (
    <RouteDialog
      closeTo="../.."
      description="Balances update as soon as you save."
      title="Edit expense"
    >
      {expense ? (
        <ExpenseForm
          actionError={actionData?.error}
          expense={expense}
          submitLabel="Save changes"
        />
      ) : (
        <p className={styles.formError}>This expense no longer exists.</p>
      )}
    </RouteDialog>
  );
}
