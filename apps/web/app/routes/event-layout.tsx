/*
THESIS: One live event register, not a stack of finance cards; a narrow split
spine keeps identity and navigation fixed while the active route reads as a
ruled working document.
OWN-WORLD: Ink spine, mustard folio, cream paper, teal current field, and brick
commitments/errors; League Gothic titles, Barlow copy, square controls, hard
one-pixel rules, and no ambient shadow.
STORY: Confirm the event and live state, choose Expenses, Settle, or People,
make one exact change, and understand any reconnect or edit conflict.
FIRST VIEWPORT: Desktop gives 240px to the register and the rest to the active
ledger; mobile stacks masthead, folio, status, and a sticky three-cell index
before the route heading and action.
FORM: Side-car Register, position 3 of 6; approved Split Spine staging; seed
c6026cc7.
*/
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
    <div className={styles.eventWorkspace}>
      <aside className={styles.eventSpine}>
        <header className={styles.eventHeader}>
          <div className={styles.eventTopbar}>
            <Brand variant="event" />
            <button
              className={`${styles.button} ${styles.buttonSecondary} ${styles.shareButton}`}
              onClick={() => void shareEvent()}
              type="button"
            >
              <ShareIcon />
              <span>Share</span>
            </button>
          </div>

          <div className={styles.eventIdentity}>
            <div>
              <p className={styles.eventKicker}>Private event</p>
              <h1 className={styles.eventTitle}>{snapshot.event.title}</h1>
            </div>
            <p className={styles.eventCurrency}>{snapshot.event.currency}</p>
          </div>

          <div className={styles.eventMeta}>
            <span className={styles.eventMetaItem}>
              <CalendarIcon height="16" width="16" />
              <time dateTime={snapshot.event.expiresAt}>
                {expiryLabel(snapshot.event.expiresAt)}
              </time>
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
        </header>

        <nav aria-label="Event" className={styles.nav}>
          <div className={styles.navInner}>
            <NavLink
              aria-label="Expenses"
              className={navClassName}
              end={false}
              to="expenses"
            >
              <span aria-hidden="true" className={styles.navNumber}>01</span>
              <span className={styles.navCopy}>
                <span className={styles.navLabel}>Expenses</span>
                <span className={styles.navDescription}>Shared costs</span>
              </span>
            </NavLink>
            <NavLink
              aria-label="Settle"
              className={navClassName}
              end={false}
              to="settle"
            >
              <span aria-hidden="true" className={styles.navNumber}>02</span>
              <span className={styles.navCopy}>
                <span className={styles.navLabel}>Settle</span>
                <span className={styles.navDescription}>What remains</span>
              </span>
            </NavLink>
            <NavLink
              aria-label="People"
              className={navClassName}
              end={false}
              to="people"
            >
              <span aria-hidden="true" className={styles.navNumber}>03</span>
              <span className={styles.navCopy}>
                <span className={styles.navLabel}>People</span>
                <span className={styles.navDescription}>The group</span>
              </span>
            </NavLink>
          </div>
        </nav>
      </aside>

      <div className={styles.eventDocument}>
        {stream.status !== "connected" ? (
          <aside
            aria-live="polite"
            className={styles.connectionNotice}
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
          className={styles.main}
          id="main-content"
          tabIndex={-1}
        >
          <Outlet context={context} />
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
