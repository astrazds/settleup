import { useState } from "react";
import { useRevalidator } from "react-router";

import { type EventLoad, useEventContext } from "../components/event-context";
import type { EventFormFailure } from "./event-form-action";

export function useAcceptedDraft(
  revision: string,
  failure: EventFormFailure | undefined,
  resetFields?: () => void,
  { followSnapshot = false }: { followSnapshot?: boolean } = {},
) {
  const lastLoad = useEventContext();
  const { snapshot } = lastLoad;
  const { revalidate } = useRevalidator();
  const version = snapshot.event.version;
  const [accepted, setAccepted] = useState({ version, revision, formKey: 0, rejected: false });
  const [pendingLoad, setPendingLoad] = useState<EventLoad>();

  // The router clears action data when it revalidates the event.
  if (
    failure?.kind === "stale" &&
    failure.version === accepted.version &&
    !accepted.rejected
  ) {
    setAccepted({ ...accepted, rejected: true });
  }
  const snapshotChanged = version !== accepted.version || revision !== accepted.revision;
  const staleSave = accepted.rejected;
  const canAccept = staleSave ? version > accepted.version : snapshotChanged;

  function acceptSnapshot() {
    setAccepted({ version, revision, formKey: accepted.formKey + 1, rejected: false });
    resetFields?.();
  }

  if (pendingLoad && pendingLoad !== lastLoad) {
    setPendingLoad(undefined);
    if (!lastLoad.refreshFailed && canAccept) {
      acceptSnapshot();
    }
  } else if (followSnapshot && !staleSave && snapshotChanged) {
    acceptSnapshot();
  }

  return {
    version: accepted.version,
    formKey: accepted.formKey,
    hasConflict: snapshotChanged || staleSave,
    isLoadingLatest: pendingLoad !== undefined,
    loadLatest: () => {
      if (canAccept) {
        acceptSnapshot();
      } else {
        setPendingLoad(lastLoad);
        void revalidate();
      }
    },
  };
}
