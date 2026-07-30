/*
THESIS: A shared-expense landing page should feel like the occasion starting,
not a finance dashboard; the generic headline-plus-card arrangement is gone.
OWN-WORLD: Ink, mustard, teal, brick, and cream form hard screen-printed fields
with condensed poster type, crisp rules, numbered cuts, and sharp controls.
STORY: Friends see private-link trust, cent-exact splitting, then start an event.
FIRST VIEWPORT: A black title field faces a cream creation panel; one exact-split
rail crosses both and connects the promise to the action.
FORM: Session Cut challenger replaced grounded position 6; approved Split Frame
staging; seed 66f1cfe8.
*/
import type { CurrencyCode } from "@settleup/contracts";
import { Form, redirect, useActionData, useNavigation } from "react-router";

import { Brand } from "../components/brand";
import { createEvent } from "../lib/api";
import { defaultCurrencyForLocales } from "../lib/currency";
import { readFormCurrency, readFormString } from "../lib/form-data";
import { setParticipantPreference } from "../lib/participant-preference";
import { actionErrorMessage } from "../components/event-context";
import styles from "../styles/home.module.css";
import type { Route } from "./+types/home";

const currencies: Array<{ code: CurrencyCode; label: string }> = [
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "NZD", label: "NZD — New Zealand dollar" },
];

const exampleShares = [
  { name: "Alex", amount: "$46.01" },
  { name: "Blair", amount: "$46.00" },
  { name: "Casey", amount: "$46.00" },
  { name: "Devon", amount: "$46.00" },
];

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();

  try {
    const result = await createEvent({
      title: readFormString(formData, "title"),
      currency: readFormCurrency(formData),
      firstParticipantName: readFormString(formData, "firstParticipantName"),
    });
    const firstParticipant = result.snapshot.participants[0];
    if (firstParticipant) {
      setParticipantPreference(result.snapshot.event, firstParticipant.id);
    }
    return redirect(`/e/${encodeURIComponent(result.token)}`);
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export default function Home() {
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const isBusy = navigation.state !== "idle";
  const defaultCurrency =
    typeof navigator === "undefined"
      ? "AUD"
      : defaultCurrencyForLocales(navigator.languages);

  return (
    <div className={styles.homePage}>
      <header className={styles.masthead}>
        <Brand variant="landing" />
        <div aria-label="SettleUp essentials" className={styles.mastheadNotes}>
          <span>Private by link</span>
          <span>No accounts</span>
          <span className={styles.sessionBadge}>Session 01</span>
        </div>
      </header>

      <main id="main-content">
        <div className={styles.heroFrame}>
          <section className={styles.promisePanel}>
            <span aria-hidden="true" className={styles.mustardCut} />
            <span aria-hidden="true" className={styles.tealCut} />
            <div className={styles.promiseInner}>
              <p className={styles.kicker}>Short-lived events · Clear next steps</p>
              <h1 className={styles.heroTitle}>
                <span>Everyone pays.</span>
                {" "}
                <span>Every cent lands.</span>
              </h1>
              <p className={styles.heroLead}>
                Create a private event, add what everyone paid, and see exactly
                who should pay whom. <strong>No accounts.</strong>
              </p>
            </div>
          </section>

          <section
            aria-labelledby="create-event-heading"
            className={styles.createPanel}
          >
            <div className={styles.createHeading}>
              <p aria-hidden="true" className={styles.sessionNumber}>
                <span>Session</span>
                01
              </p>
              <div>
                <h2 id="create-event-heading">Start a private event</h2>
                <p>The whole group uses one private link.</p>
              </div>
            </div>

            <Form className={styles.createForm} method="post">
              <div className={styles.field}>
                <label htmlFor="title">What are you splitting?</label>
                <input
                  autoComplete="off"
                  id="title"
                  maxLength={120}
                  name="title"
                  placeholder="Weekend away"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="firstParticipantName">Your name</label>
                <input
                  autoComplete="name"
                  id="firstParticipantName"
                  maxLength={80}
                  name="firstParticipantName"
                  placeholder="Andrejs"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="currency">Currency</label>
                <select
                  defaultValue={defaultCurrency}
                  id="currency"
                  name="currency"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>

              {actionData?.error ? (
                <p aria-live="polite" className={styles.formError} role="alert">
                  {actionData.error}
                </p>
              ) : null}

              <button
                className={styles.createButton}
                disabled={isBusy}
                type="submit"
              >
                <span>{isBusy ? "Creating…" : "Create private event"}</span>
                <span aria-hidden="true" className={styles.buttonArrow}>
                  →
                </span>
              </button>
            </Form>

            <p className={styles.trustNote}>
              <span aria-hidden="true">↗</span>
              Anyone with the complete link can view and update the event.
            </p>
          </section>
        </div>

        <section
          aria-labelledby="example-split-heading"
          className={styles.splitRail}
        >
          <div className={styles.splitIntro}>
            <p>Illustrative equal split</p>
            <h2 id="example-split-heading">
              Dinner <span>AUD $184.01</span>
            </h2>
          </div>
          <div aria-hidden="true" className={styles.splitCue}>
            <span>Split exactly</span>
            <strong>→</strong>
          </div>
          <ol className={styles.shareList}>
            {exampleShares.map((share) => (
              <li key={share.name}>
                <strong>{share.amount}</strong>
                <span>{share.name}</span>
              </li>
            ))}
          </ol>
          <p className={styles.exactStamp}>
            <strong>Every cent assigned</strong>
            Remainder cents go top to bottom in participant order.
          </p>
        </section>

        <section aria-labelledby="how-it-works-heading" className={styles.storyBand}>
          <div className={styles.storyHeading}>
            <p>One shared session</p>
            <h2 id="how-it-works-heading">From first cost to final handoff.</h2>
          </div>
          <ol className={styles.storySteps}>
            <li>
              <span>01</span>
              <div>
                <h3>Create</h3>
                <p>Open a private event and share its complete link.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Record</h3>
                <p>Add costs as they happen. Equal splits stay cent-exact.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Settle</h3>
                <p>Follow one clear suggestion and record the payment made elsewhere.</p>
              </div>
            </li>
          </ol>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Available for three days · Deleted after the five-day cleanup deadline</p>
        <p>SettleUp records payments. It never moves money.</p>
      </footer>
    </div>
  );
}
