import type { CurrencyCode } from "@settleup/contracts";
import { Form, redirect, useActionData, useNavigation } from "react-router";

import { Brand } from "../components/brand";
import { actionErrorMessage, createEvent } from "../lib/api";
import { defaultCurrencyForLocales } from "../lib/currency";
import { readFormCurrency, readFormString } from "../lib/form-data";
import { setParticipantPreference } from "../lib/participant-preference";

import styles from "../styles/home.module.css";
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
    <div className={styles.homePage}>
      <header className={styles.masthead}>
        <Brand variant="landing" />
      </header>
      <main className={styles.main} id="main-content">
        <h1 className={styles.heroTitle}>
          Everyone pays.{" "}<br />Every cent lands.
        </h1>
        <p className={styles.heroLead}>Split shared costs. Settle up. No accounts.</p>
        <section aria-label="Start a private event">
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
            </button>
          </Form>
          <p className={styles.trustNote}>
            Anyone with the complete link can view and edit.<br />
            Your event is available for three days.
          </p>
        </section>
      </main>
      <footer className={styles.footer}>
        SettleUp records payments made elsewhere. It never moves money.
      </footer>
    </div>
  );
}
