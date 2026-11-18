import { redirect, useActionData } from "react-router";


import { PersonForm } from "../components/person-form";
import { RouteDialog } from "../components/route-dialog";
import { addParticipant } from "../lib/api";
import { eventFormFailure } from "../lib/event-form-action";
import { readParticipantSubmission } from "../lib/form-data";
import type { Route } from "./+types/person-new";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    const { command, expectedVersion } = readParticipantSubmission(formData);
    await addParticipant(
      token,
      command,
      { expectedVersion },
    );
    return redirect(`/e/${encodeURIComponent(token)}/people`);
  } catch (error) {
    return eventFormFailure(error, formData);
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
      <PersonForm actionFailure={actionData} submitLabel="Add person" />
    </RouteDialog>
  );
}
