import { ApiError, actionErrorMessage } from "./api";
import { readFormVersion } from "./form-data";

export type EventFormFailure =
  | { kind: "stale"; version: number }
  | { kind: "error"; message: string };

export function eventFormFailure(error: unknown, formData: FormData): EventFormFailure {
  if (error instanceof ApiError && error.status === 412) {
    return { kind: "stale", version: readFormVersion(formData) };
  }
  return { kind: "error", message: actionErrorMessage(error) };
}
