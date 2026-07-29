import type { Participant } from "@settleup/contracts";
import { useState } from "react";
import { Form, useNavigation } from "react-router";

import { EditConflict } from "./edit-conflict";
import { useEventContext } from "./event-context";
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
  const [acceptedRevision, setAcceptedRevision] = useState(currentRevision);
  const [acceptedVersion, setAcceptedVersion] = useState(
    snapshot.event.version,
  );
  const [formKey, setFormKey] = useState(0);
  const hasConflict =
    currentRevision !== acceptedRevision ||
    snapshot.event.version !== acceptedVersion;

  return (
    <Form className={styles.form} key={formKey} method="post">
      <input
        name="eventVersion"
        type="hidden"
        value={acceptedVersion}
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

      {hasConflict ? (
        <EditConflict
          onReload={() => {
            setAcceptedRevision(currentRevision);
            setAcceptedVersion(snapshot.event.version);
            setFormKey((value) => value + 1);
          }}
        />
      ) : null}

      <div className={styles.dialogActions}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={isBusy || hasConflict}
          type="submit"
        >
          {isBusy ? "Saving…" : submitLabel}
        </button>
      </div>
    </Form>
  );
}
