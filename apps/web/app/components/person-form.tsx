import type { Participant } from "@settleup/contracts";
import { Form, useNavigation } from "react-router";

import { EditConflict } from "./edit-conflict";
import { useEventContext } from "./event-context";
import { useAcceptedDraft } from "../lib/use-accepted-draft";
import styles from "../styles/app.module.css";

interface PersonFormProps {
  actionError?: string;
  participant?: Participant;
  submitLabel: string;
}

export function PersonForm({
  actionError,
  participant,
  submitLabel,
}: PersonFormProps) {
  const { snapshot } = useEventContext();
  const navigation = useNavigation();
  const isBusy = navigation.state !== "idle";
  const currentRevision = participant?.name ?? "new";
  const draft = useAcceptedDraft(snapshot.event.version, currentRevision);

  return (
    <Form className={styles.form} key={draft.formKey} method="post">
      <input
        name="eventVersion"
        type="hidden"
        value={draft.version}
      />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="name">
          Name
        </label>
        <input
          autoComplete="off"
          autoFocus
          className={styles.input}
          defaultValue={participant?.name}
          id="name"
          maxLength={80}
          name="name"
          placeholder="Mia"
          required
        />
      </div>

      {actionError ? (
        <p aria-live="polite" className={styles.formError} role="alert">
          {actionError}
        </p>
      ) : null}

      {draft.hasConflict ? (
        <EditConflict onReload={draft.acceptLatest} />
      ) : null}

      <div className={styles.dialogActions}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={isBusy || draft.hasConflict}
          type="submit"
        >
          {isBusy ? "Saving…" : submitLabel}
        </button>
      </div>
    </Form>
  );
}
