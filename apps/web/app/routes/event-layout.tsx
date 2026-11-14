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
import { EventProvider, type EventContextValue } from "../components/event-context";
import { ShareIcon } from "../components/icons";
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
  const context = useMemo<EventContextValue>(
    () => ({
      snapshot,
      streamStatus: stream.status,
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
    <div className={styles.eventWorkspace}>
      <header className={styles.eventTopbar}>
        <Brand variant="event" />
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => void shareEvent()}
          type="button"
        >
          <ShareIcon />
          <span>Share link</span>
        </button>
      </header>
      <section aria-labelledby="event-title" className={styles.eventBanner}>
        <div className={styles.eventHeader}>
          <h1 className={styles.eventTitle} id="event-title">{snapshot.event.title}</h1>
          <div className={styles.eventMeta}>
            <span>{snapshot.event.currency}</span>
            <time dateTime={snapshot.event.expiresAt}>
              {expiryLabel(snapshot.event.expiresAt)}
            </time>
            <span
              aria-atomic="true"
              aria-live="polite"
              className={styles.eventStatus}
              role="status"
              title={
                stream.isOffline
                  ? "Live updates offline"
                  : stream.status === "connected"
                    ? "Live updates connected"
                    : "Live updates reconnecting"
              }
            >
              <span
                aria-hidden="true"
                className={`${styles.statusDot} ${stream.isOffline ? styles.statusDotOffline : ""}`}
              />
              {stream.isOffline
                ? "Offline"
                : stream.status === "connected"
                  ? "Up to date"
                  : "Reconnecting"}
            </span>
          </div>
          <nav aria-label="Event" className={styles.nav}>
            <NavLink aria-label="Expenses" className={navClassName} to="expenses">Expenses</NavLink>
            <NavLink aria-label="Settle" className={navClassName} to="settle">Settle</NavLink>
            <NavLink aria-label="People" className={navClassName} to="people">People</NavLink>
          </nav>
        </div>
      </section>

      <div className={styles.eventDocument}>
        {stream.status !== "connected" ? (
          <aside className={styles.connectionNotice}>
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
          className={styles.main}
          id="main-content"
          tabIndex={-1}
        >
          <EventProvider value={context}>
            <Outlet />
          </EventProvider>
        </main>
      </div>

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
  );
}
