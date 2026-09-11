import type { EventSnapshot } from "@settleup/contracts";

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
