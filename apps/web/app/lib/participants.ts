import type { EventSnapshot } from "@settleup/contracts";

export function participantName(snapshot: EventSnapshot, participantId: string): string {
  return (
    snapshot.participants.find((participant) => participant.id === participantId)?.name ??
    "Unknown person"
  );
}
