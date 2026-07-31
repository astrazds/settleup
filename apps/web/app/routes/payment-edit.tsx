import { redirect, useActionData } from "react-router";

import { actionErrorMessage, useEventContext } from "../components/event-context";
import { PaymentForm } from "../components/payment-form";
import { RouteDialog } from "../components/route-dialog";
import { updatePayment } from "../lib/api";
import {
  readFormCurrency,
  readFormString,
  readFormVersion,
} from "../lib/form-data";
import { parseAmountMinor } from "../lib/money";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/payment-edit";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    await updatePayment(
      token,
      params.paymentId ?? "",
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

export default function EditPayment({ params }: Route.ComponentProps) {
  const { snapshot } = useEventContext();
  const actionData = useActionData<typeof clientAction>();
  const payment = snapshot.payments.find((item) => item.id === params.paymentId);

  return (
    <RouteDialog
      closeTo=".."
      description="Balances update as soon as you save."
      title="Edit payment"
    >
      {payment ? (
        <PaymentForm
          actionError={actionData?.error}
          payment={payment}
          submitLabel="Save changes"
        />
      ) : (
        <p className={styles.formError}>This payment no longer exists.</p>
      )}
    </RouteDialog>
  );
}
