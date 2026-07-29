import { redirect, useActionData } from "react-router";

import { RouteDialog } from "../components/dialog";
import { actionErrorMessage } from "../components/event-context";
import { ExpenseForm } from "../components/expense-form";
import { createExpense } from "../lib/api";
import {
  readFormCurrency,
  readFormString,
  readFormStrings,
  readFormVersion,
} from "../lib/form-data";
import { parseAmountMinor } from "../lib/money";
import type { Route } from "./+types/expense-new";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    await createExpense(
      token,
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
