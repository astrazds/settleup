import type { EventSnapshot } from "@settleup/contracts";
import { useOutletContext } from "react-router";

export interface EventOutletContext {
  snapshot: EventSnapshot;
  streamStatus: "connecting" | "connected" | "reconnecting" | "offline";
  token: string;
}

export function useEventContext(): EventOutletContext {
  return useOutletContext<EventOutletContext>();
}

export function participantName(snapshot: EventSnapshot, participantId: string): string {
  return (
    snapshot.participants.find((participant) => participant.id === participantId)?.name ??
    "Unknown person"
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function actionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong. Your event was not changed.";
}
