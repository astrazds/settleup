export interface DraftUpdateWarningInput {
  preserveDrafts: boolean
  previousEventUpdatedAt: string | null
  nextEventUpdatedAt: string | null
  hasActiveDraft: boolean
}

export function shouldShowDraftUpdateWarning(input: DraftUpdateWarningInput): boolean {
  return Boolean(
    input.preserveDrafts &&
    input.hasActiveDraft &&
    input.previousEventUpdatedAt &&
    input.nextEventUpdatedAt &&
    input.nextEventUpdatedAt !== input.previousEventUpdatedAt
  )
}

export interface ParticipantIdSnapshot {
  participants: readonly { id: string }[]
}

export function newParticipantId(previousSnapshot: ParticipantIdSnapshot, nextSnapshot: ParticipantIdSnapshot): string | null {
  const previousIds = new Set(previousSnapshot.participants.map((participant) => participant.id))
  return nextSnapshot.participants.find((participant) => !previousIds.has(participant.id))?.id || null
}
