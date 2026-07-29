import { redirect, useActionData } from "react-router";

import { RouteDialog } from "../components/dialog";
import { actionErrorMessage, useEventContext } from "../components/event-context";
import { PaymentForm } from "../components/payment-form";
import { createPayment } from "../lib/api";
import {
  readFormCurrency,
  readFormString,
  readFormVersion,
} from "../lib/form-data";
import { parseAmountMinor } from "../lib/money";
import type { Route } from "./+types/payment-new";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    await createPayment(
      token,
      {
        from: readFormString(formData, "from"),
        to: readFormString(formData, "to"),
        amountMinor: parseAmountMinor(
          readFormString(formData, "amount"),
          readFormCurrency(formData),
        ),
      },
      {
        expectedVersion: readFormVersion(formData),
      },
    );
    return redirect(`/e/${encodeURIComponent(token)}/settle`);
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export default function NewPayment() {
  const actionData = useActionData<typeof clientAction>();
  const { snapshot } = useEventContext();

  return (
    <RouteDialog
      closeTo=".."
      description="Only record money that has already moved."
      title="Record payment"
    >
      <PaymentForm
        actionError={actionData?.error}
        submitLabel="Record payment"
        suggestion={snapshot.settlementSuggestion}
      />
    </RouteDialog>
  );
}
