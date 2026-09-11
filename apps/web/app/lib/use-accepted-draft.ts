import { useState } from "react";

export function useAcceptedDraft(version: number, revision: string) {
  const [accepted, setAccepted] = useState({ version, revision, formKey: 0 });

  return {
    version: accepted.version,
    formKey: accepted.formKey,
    hasConflict: version !== accepted.version || revision !== accepted.revision,
    acceptLatest: () => {
      setAccepted((previous) => ({
        version,
        revision,
        formKey: previous.formKey + 1,
      }));
    },
  };
}
