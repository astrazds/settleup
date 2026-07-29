import { Link, Outlet, useFetcher } from "react-router";

import { DeleteConfirm } from "../components/dialog";
import {
  actionErrorMessage,
  initials,
  useEventContext,
} from "../components/event-context";
import { EditIcon, PlusIcon } from "../components/icons";
import { deleteParticipant } from "../lib/api";
import { readFormString, readFormVersion } from "../lib/form-data";
import { formatMoney } from "../lib/money";
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
  const context = useEventContext();
  const { snapshot } = context;
  const fetcher = useFetcher<typeof clientAction>();

  return (
    <>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderCopy}>
            <h2 className={styles.pageTitle}>People</h2>
            <p className={styles.pageIntro}>
              Everyone who can pay or share an expense.
            </p>
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
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle} id="people-list-heading">
              {snapshot.participants.length}{" "}
              {snapshot.participants.length === 1 ? "person" : "people"}
            </h3>
          </div>
          <ul className={styles.list}>
            {snapshot.participants.map((participant) => {
              const balance = snapshot.balances.find(
                (item) => item.participantId === participant.id,
              );
              return (
                <li className={styles.listItem} key={participant.id}>
                  <div aria-hidden="true" className={styles.avatar}>
                    {initials(participant.name)}
                  </div>
                  <div className={styles.listMain}>
                    <div className={styles.listTitleRow}>
                      <p className={styles.listTitle}>{participant.name}</p>
                    </div>
                    <p className={styles.listMeta}>
                      {!balance || balance.netMinor === 0
                        ? "Settled"
                        : balance.netMinor > 0
                          ? `Gets back ${formatMoney(balance.netMinor, snapshot.event.currency)}`
                          : `Owes ${formatMoney(Math.abs(balance.netMinor), snapshot.event.currency)}`}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <Link
                      aria-label={`Edit ${participant.name}`}
                      className={styles.iconButton}
                      title={`Edit ${participant.name}`}
                      to={`${participant.id}/edit`}
                    >
                      <EditIcon />
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
            Names are shared with everyone who has the private event link.
          </p>
        </section>
      </div>
      <Outlet context={context} />
    </>
  );
}
