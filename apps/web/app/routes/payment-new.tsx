import { redirect, useActionData } from "react-router";

import { useEventContext } from "../components/event-context";
import { PaymentForm } from "../components/payment-form";
import { RouteDialog } from "../components/route-dialog";
import { actionErrorMessage, createPayment } from "../lib/api";
import { readPaymentSubmission } from "../lib/form-data";
import type { Route } from "./+types/payment-new";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    const { command, expectedVersion } = readPaymentSubmission(formData);
    await createPayment(
      token,
      command,
      { expectedVersion },
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
