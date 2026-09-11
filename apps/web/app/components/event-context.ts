import type { EventSnapshot } from "@settleup/contracts";
import { createContext, useContext } from "react";

import type { EventStreamStatus } from "../lib/use-event-stream";

export interface EventContextValue {
  snapshot: EventSnapshot;
  streamStatus: EventStreamStatus;
}

const EventContext = createContext<EventContextValue | null>(null);
export const EventProvider = EventContext.Provider;

export function useEventContext(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("Event components must be inside EventProvider.");
  }
  return context;
}
