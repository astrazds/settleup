import type {
  EventSummary,
  Participant,
} from "@settleup/contracts";

type EventIdentity = Pick<EventSummary, "id">;
type ParticipantIdentity = Pick<Participant, "id">;

const KEY_PREFIX = "settleup:participant:";

export function getParticipantPreference(
  event: EventIdentity,
  participants?: readonly ParticipantIdentity[],
  storage: Storage | null = sessionStorageIfAvailable(),
): string | null {
  if (!storage) {
    return null;
  }

  try {
    const participantId = storage.getItem(preferenceKey(event));

    if (
      participantId &&
      participants &&
      !participants.some((participant) => participant.id === participantId)
    ) {
      storage.removeItem(preferenceKey(event));
      return null;
    }

    return participantId;
  } catch {
    return null;
  }
}

export function setParticipantPreference(
  event: EventIdentity,
  participantId: string,
  storage: Storage | null = sessionStorageIfAvailable(),
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(preferenceKey(event), participantId);
  } catch {
    // The preference is optional when storage is unavailable or full.
  }
}

function preferenceKey(event: EventIdentity): string {
  return `${KEY_PREFIX}${event.id}`;
}

function sessionStorageIfAvailable(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
