import { Link, Outlet, useFetcher } from "react-router";

import { DeleteConfirm } from "../components/delete-confirm";
import { useEventContext } from "../components/event-context";
import { EditIcon, PlusIcon } from "../components/icons";
import { actionErrorMessage, deleteParticipant } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/people";

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const participantId = readFormString(formData, "participantId");

  try {
    await deleteParticipant(params.token ?? "", participantId, {
      expectedVersion: readFormVersion(formData),
    });
    return { ok: true as const };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export default function People() {
  const { snapshot } = useEventContext();
  const fetcher = useFetcher<typeof clientAction>();

  return (
    <>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderCopy}>
            <h2 className={styles.pageTitle}>
              {snapshot.participants.length}{" "}
              {snapshot.participants.length === 1 ? "person" : "people"}
            </h2>
          </div>
          <Link
            className={`${styles.button} ${styles.buttonPrimary}`}
            to="new"
          >
            <PlusIcon />
            <span>Add person</span>
          </Link>
        </div>

        {fetcher.data && "error" in fetcher.data ? (
          <p aria-live="polite" className={styles.formError} role="alert">
            {fetcher.data.error}
          </p>
        ) : null}

        <section aria-labelledby="people-list-heading" className={styles.section}>
          <h3 className={styles.visuallyHidden} id="people-list-heading">People</h3>
          <ul className={styles.list}>
            {snapshot.participants.map((participant) => {
              return (
                <li className={`${styles.listItem} ${styles.personRow}`} key={participant.id}>
                  <div className={styles.listMain}>
                    <p className={styles.listTitle}>{participant.name}</p>
                  </div>
                  <div className={styles.itemActions}>
                    <Link
                      aria-label={`Edit ${participant.name}`}
                      className={styles.iconButton}
                      title={`Edit ${participant.name}`}
                      to={`${participant.id}/edit`}
                    >
                      <EditIcon />
                      <span aria-hidden="true" className={styles.actionLabel}>
                        Edit
                      </span>
                    </Link>
                    <DeleteConfirm
                      description={`“${participant.name}” can only be removed if they are not referenced by an expense or payment.`}
                      disabled={
                        snapshot.participants.length === 1 ||
                        fetcher.state !== "idle"
                      }
                      disabledReason={
                        snapshot.participants.length === 1
                          ? "At least one person must remain in the event."
                          : "Another person change is still being saved."
                      }
                      itemLabel={participant.name}
                      onConfirm={() => {
                        void fetcher.submit(
                          {
                            eventVersion: snapshot.event.version.toString(),
                            participantId: participant.id,
                          },
                          { method: "post" },
                        );
                      }}
                      title="Remove this person?"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className={styles.hint}>
            Everyone with the link can view and edit.
          </p>
        </section>
      </div>
      <Outlet />
    </>
  );
}
