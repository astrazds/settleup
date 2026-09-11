import { redirect, useActionData } from "react-router";


import { ExpenseForm } from "../components/expense-form";
import { RouteDialog } from "../components/route-dialog";
import { actionErrorMessage, createExpense } from "../lib/api";
import { readExpenseSubmission } from "../lib/form-data";
import type { Route } from "./+types/expense-new";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    const { command, expectedVersion } = readExpenseSubmission(formData);
    await createExpense(
      token,
      command,
      { expectedVersion },
    );
    return redirect(`/e/${encodeURIComponent(token)}/expenses`);
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export default function NewExpense() {
  const actionData = useActionData<typeof clientAction>();

  return (
    <RouteDialog
      closeTo=".."
      description="Choose who paid and who shared it."
      title="Add expense"
    >
      <ExpenseForm actionError={actionData?.error} submitLabel="Add expense" />
    </RouteDialog>
  );
}
