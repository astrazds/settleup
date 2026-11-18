import type { EventSnapshot } from "@settleup/contracts";
import { createContext, useContext } from "react";

export interface EventLoad {
  snapshot: EventSnapshot;
  refreshFailed: boolean;
}

const EventContext = createContext<EventLoad | null>(null);
export const EventProvider = EventContext.Provider;

export function useEventContext(): EventLoad {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("Event components must be inside EventProvider.");
  }
  return context;
}
