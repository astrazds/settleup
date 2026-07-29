import { changedEventDataSchema } from "@settleup/contracts";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

export type EventStreamStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

interface EventSourceLike {
  addEventListener(
    type: string,
    listener: (event: Event) => void,
  ): void;
  close(): void;
}

export interface UseEventStreamOptions {
  eventSourceFactory?: (url: string) => EventSourceLike;
  revalidate: () => void;
  token: string;
  version: number;
}

export interface EventStreamState {
  isOffline: boolean;
  status: EventStreamStatus;
}

interface ConnectionState {
  status: EventStreamStatus;
  token: string;
}

export function useEventStream({
  eventSourceFactory = defaultEventSourceFactory,
  revalidate,
  token,
  version,
}: UseEventStreamOptions): EventStreamState {
  const [connection, setConnection] = useState<ConnectionState>(() => ({
    status: isBrowserOffline() ? "offline" : "connecting",
    token,
  }));
  const latestVersion = useRef(version);
  const revalidateCurrentEvent = useEffectEvent(revalidate);
  const createEventSource = useEffectEvent(eventSourceFactory);

  useEffect(() => {
    latestVersion.current = version;
  }, [token, version]);

  useEffect(() => {
    let active = true;
    let source: EventSourceLike | undefined;

    const setCurrentStatus = (status: EventStreamStatus): void => {
      setConnection({ status, token });
    };

    const handleFocus = (): void => {
      if (!isBrowserOffline()) {
        revalidateCurrentEvent();
      }
    };

    const handleOffline = (): void => {
      setCurrentStatus("offline");
    };

    const handleOnline = (): void => {
      setCurrentStatus("reconnecting");
      revalidateCurrentEvent();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    try {
      source = createEventSource(
        `/api/events/${encodeURIComponent(token)}/stream`,
      );

      source.addEventListener("connected", () => {
        setCurrentStatus("connected");
        // The initial snapshot may have changed between its fetch and this
        // subscription becoming live, so connected also invalidates it.
        revalidateCurrentEvent();
      });
      source.addEventListener("changed", (event) => {
        if (!(event instanceof MessageEvent)) {
          return;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(event.data as string);
        } catch {
          return;
        }

        const result = changedEventDataSchema.safeParse(payload);
        if (!result.success || result.data.version <= latestVersion.current) {
          return;
        }

        latestVersion.current = result.data.version;
        revalidateCurrentEvent();
      });
      source.addEventListener("error", () => {
        setCurrentStatus(isBrowserOffline() ? "offline" : "reconnecting");
      });
    } catch {
      queueMicrotask(() => {
        if (active) {
          setCurrentStatus(isBrowserOffline() ? "offline" : "reconnecting");
        }
      });
    }

    return () => {
      active = false;
      source?.close();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [token]);

  const status =
    connection.token === token
      ? connection.status
      : isBrowserOffline()
        ? "offline"
        : "connecting";

  return {
    isOffline: status === "offline",
    status,
  };
}

function defaultEventSourceFactory(url: string): EventSourceLike {
  return new EventSource(url);
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
