import type { CurrencyCode } from "@settleup/contracts";
import { Form, redirect, useActionData, useNavigation } from "react-router";

import { Brand } from "../components/brand";
import { createEvent } from "../lib/api";
import { defaultCurrencyForLocales } from "../lib/currency";
import { readFormCurrency, readFormString } from "../lib/form-data";
import { setParticipantPreference } from "../lib/participant-preference";
import { actionErrorMessage } from "../components/event-context";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/home";

const currencies: Array<{ code: CurrencyCode; label: string }> = [
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "NZD", label: "NZD — New Zealand dollar" },
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
    <>
      <header className={`${styles.shell} ${styles.homeHeader}`}>
        <Brand />
      </header>
      <main className={`${styles.shell} ${styles.homeMain}`} id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Shared costs, minus the fuss</p>
            <h1 className={styles.heroTitle}>Split the moment. Keep it simple.</h1>
            <p className={styles.heroLead}>
              Create a private event, add what everyone paid, and see exactly who
              should settle with whom. No accounts. No spreadsheet.
            </p>
          </div>

          <div className={styles.createCard}>
            <div>
              <h2 className={styles.cardHeading}>Start an event</h2>
              <p className={styles.hint}>
                The private link is the key. Anyone with it can update the event.
              </p>
            </div>

            <Form className={styles.form} method="post">
              <div className={styles.field}>
                <label className={styles.label} htmlFor="title">
                  What are you splitting?
                </label>
                <input
                  autoComplete="off"
                  className={styles.input}
                  id="title"
                  maxLength={120}
                  name="title"
                  placeholder="Weekend away"
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="firstParticipantName">
                  Your name
                </label>
                <input
                  autoComplete="name"
                  className={styles.input}
                  id="firstParticipantName"
                  maxLength={80}
                  name="firstParticipantName"
                  placeholder="Andrejs"
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="currency">
                  Currency
                </label>
                <select
                  className={styles.select}
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
                className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonWide}`}
                disabled={isBusy}
                type="submit"
              >
                {isBusy ? "Creating…" : "Create private event"}
              </button>
            </Form>

            <p className={styles.hint}>
              Events are available for three days, then removed shortly after. SettleUp
              does not move money or create an account.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
