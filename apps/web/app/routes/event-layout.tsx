import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useRevalidator,
} from "react-router";

import { Brand } from "../components/brand";
import type { EventOutletContext } from "../components/event-context";
import {
  CalendarIcon,
  PeopleIcon,
  ReceiptIcon,
  SettleIcon,
  ShareIcon,
} from "../components/icons";
import { getEvent } from "../lib/api";
import { useEventStream } from "../lib/use-event-stream";
import styles from "../styles/app.module.css";
import type { Route } from "./+types/event-layout";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.token) {
    throw new Error("Event token is missing.");
  }

  return getEvent(params.token);
}

export const meta = ({ loaderData }: Route.MetaArgs) => [
  {
    title: loaderData
      ? `${loaderData.event.title} — SettleUp`
      : "Event — SettleUp",
  },
  { name: "robots", content: "noindex, nofollow, noarchive" },
  { name: "referrer", content: "no-referrer" },
];

function expiryLabel(expiresAt: string): string {
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) {
    return "Available for three days";
  }

  return `Available until ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expiry)}`;
}

function navClassName({ isActive }: { isActive: boolean }) {
  return `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;
}

export default function EventLayout() {
  const snapshot = useLoaderData<typeof clientLoader>();
  const location = useLocation();
  const revalidator = useRevalidator();
  const [shareMessage, setShareMessage] = useState("");
  const sectionMatch = /\/(expenses|settle|people)\/?$/.exec(
    location.pathname,
  );
  const sectionKey = sectionMatch?.[1]
    ? `${snapshot.event.id}:${sectionMatch[1]}`
    : null;
  const previousSectionKey = useRef<string | null>(null);
  const revalidate = useCallback(() => {
    void revalidator.revalidate();
  }, [revalidator]);
  const stream = useEventStream({
    token: snapshot.event.token,
    version: snapshot.event.version,
    revalidate,
  });
  const context = useMemo<EventOutletContext>(
    () => ({
      snapshot,
      streamStatus: stream.status,
      token: snapshot.event.token,
    }),
    [snapshot, stream.status],
  );

  useEffect(() => {
    if (!sectionKey || previousSectionKey.current === sectionKey) {
      return;
    }

    previousSectionKey.current = sectionKey;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById("main-content")
        ?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sectionKey]);

  useEffect(() => {
    if (!shareMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setShareMessage(""), 3_000);
    return () => window.clearTimeout(timeout);
  }, [shareMessage]);

  async function shareEvent() {
    const url = new URL(
      `/e/${encodeURIComponent(snapshot.event.token)}`,
      window.location.origin,
    ).toString();
    const shareData = {
      title: snapshot.event.title,
      text: `Join ${snapshot.event.title} on SettleUp`,
      url,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData) !== false) {
        await navigator.share(shareData);
        setShareMessage("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Private link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      window.prompt("Copy this private link", url);
      setShareMessage("Private link ready to copy.");
    }
  }

  return (
    <>
      <header className={`${styles.shell} ${styles.eventHeader}`}>
        <div className={styles.eventTopbar}>
          <Brand />
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => void shareEvent()}
            type="button"
          >
            <ShareIcon />
            Share
          </button>
          {shareMessage ? (
            <span
              aria-live="polite"
              className={styles.shareStatus}
              role="status"
            >
              {shareMessage}
            </span>
          ) : null}
        </div>

        <div className={styles.eventIdentity}>
          <h1 className={styles.eventTitle}>{snapshot.event.title}</h1>
          <div className={styles.eventMeta}>
            <span className={styles.eventMetaItem}>
              {snapshot.event.currency}
            </span>
            <span className={styles.eventMetaItem}>
              <CalendarIcon height="16" width="16" />
              {expiryLabel(snapshot.event.expiresAt)}
            </span>
            <span
              className={styles.eventMetaItem}
              title={
                stream.status === "connected"
                  ? "Live updates connected"
                  : "Live updates reconnecting"
              }
            >
              <span
                aria-hidden="true"
                className={`${styles.statusDot} ${
                  stream.isOffline ? styles.statusDotOffline : ""
                }`}
              />
              {stream.isOffline
                ? "Offline"
                : stream.status === "connected"
                  ? "Up to date"
                  : "Reconnecting"}
            </span>
          </div>
        </div>
      </header>

      <nav aria-label="Event" className={styles.nav}>
        <div className={`${styles.shell} ${styles.navInner}`}>
          <NavLink className={navClassName} end={false} to="expenses">
            <ReceiptIcon />
            Expenses
          </NavLink>
          <NavLink className={navClassName} end={false} to="settle">
            <SettleIcon />
            Settle
          </NavLink>
          <NavLink className={navClassName} end={false} to="people">
            <PeopleIcon />
            People
          </NavLink>
        </div>
      </nav>

      {stream.status !== "connected" ? (
        <aside
          aria-live="polite"
          className={`${styles.shell} ${styles.connectionNotice}`}
        >
          <span>
            {stream.isOffline
              ? "You’re offline. Existing details stay visible, but changes need a connection."
              : "Live updates are reconnecting. Refresh if someone else just made a change."}
          </span>
          <button
            className={styles.textButton}
            onClick={revalidate}
            type="button"
          >
            Refresh now
          </button>
        </aside>
      ) : null}

      <main
        aria-label={`${snapshot.event.title} event workspace`}
        className={`${styles.shell} ${styles.main}`}
        id="main-content"
        tabIndex={-1}
      >
        <Outlet context={context} />
      </main>
    </>
  );
}
