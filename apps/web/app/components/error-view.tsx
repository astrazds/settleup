import { Link, useRouteError } from "react-router";

import { Brand } from "./brand";
import { ApiError } from "../lib/api";
import styles from "../styles/app.module.css";

interface ErrorDetails {
  canRetry: boolean;
  code: string;
  message: string;
  title: string;
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof ApiError) {
    if (error.kind === "expired") {
      return {
        canRetry: false,
        code: "Link expired",
        title: "This event has wrapped up",
        message:
          "Private event links stay active for three days. Create a new event to keep splitting.",
      };
    }

    if (error.kind === "not-found") {
      return {
        canRetry: false,
        code: "Not found",
        title: "We can’t find that event",
        message:
          "Check that the complete private link was copied. It may also have been cleaned up.",
      };
    }

    if (error.kind === "network") {
      return {
        canRetry: true,
        code: "Connection problem",
        title: "SettleUp is out of reach",
        message: "Check your connection, then try loading the event again.",
      };
    }
  }

  return {
    canRetry: true,
    code: "Something went wrong",
    title: "We hit a snag",
    message: "Your event data was not changed. Try again in a moment.",
  };
}

export function RootErrorView() {
  const error = useRouteError();
  const details = getErrorDetails(error);

  return (
    <div className={styles.app}>
      <header className={`${styles.shell} ${styles.homeHeader}`}>
        <Brand />
      </header>
      <main className={`${styles.shell} ${styles.errorPage}`} id="main-content">
        <p className={styles.errorCode}>{details.code}</p>
        <h1 className={styles.errorTitle}>{details.title}</h1>
        <p className={styles.errorText}>{details.message}</p>
        <div className={styles.errorActions}>
          {details.canRetry ? (
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => window.location.reload()}
              type="button"
            >
              Try again
            </button>
          ) : null}
          <Link
            className={`${styles.button} ${
              details.canRetry ? styles.buttonSecondary : styles.buttonPrimary
            }`}
            to="/"
          >
            Start a new event
          </Link>
        </div>
      </main>
    </div>
  );
}
