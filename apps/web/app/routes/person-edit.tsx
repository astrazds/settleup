import { redirect, useActionData } from "react-router";

import { actionErrorMessage, useEventContext } from "../components/event-context";
import { PersonForm } from "../components/person-form";
import { RouteDialog } from "../components/route-dialog";
import { renameParticipant } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/person-edit";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const token = params.token ?? "";

  try {
    await renameParticipant(
      token,
      params.participantId ?? "",
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

export default function EditPerson({ params }: Route.ComponentProps) {
  const { snapshot } = useEventContext();
  const actionData = useActionData<typeof clientAction>();
  const participant = snapshot.participants.find(
    (item) => item.id === params.participantId,
  );

  return (
    <RouteDialog
      closeTo=".."
      description="The new name appears everywhere in this event."
      title="Edit person"
    >
      {participant ? (
        <PersonForm
          actionError={actionData?.error}
          participant={participant}
          submitLabel="Save changes"
        />
      ) : (
        <p className={styles.formError}>This person no longer exists.</p>
      )}
    </RouteDialog>
  );
}
