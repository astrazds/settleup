import { redirect, useActionData } from "react-router";

import { RouteDialog } from "../components/dialog";
import { actionErrorMessage } from "../components/event-context";
import { PersonForm } from "../components/person-form";
import { addParticipant } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import type { Route } from "./+types/person-new";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    await addParticipant(
      token,
      {
        name: readFormString(formData, "name"),
      },
      {
        expectedVersion: readFormVersion(formData),
      },
    );
    return redirect(`/e/${encodeURIComponent(token)}/people`);
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export default function NewPerson() {
  const actionData = useActionData<typeof clientAction>();

  return (
    <RouteDialog
      closeTo=".."
      description="They will be available in expense and payment forms."
      title="Add person"
    >
      <PersonForm actionError={actionData?.error} submitLabel="Add person" />
    </RouteDialog>
  );
}
