import {
  apiErrorResponseSchema,
  createEventCommandSchema,
  createEventResponseSchema,
  eventSnapshotSchema,
  expenseCommandSchema,
  participantCommandSchema,
  paymentCommandSchema,
  type CreateEventCommand,
  type CreateEventResponse,
  type EventSnapshot,
  type ExpenseCommand,
  type ParticipantCommand,
  type PaymentCommand,
} from "@settleup/contracts";

export type ApiErrorKind =
  | "bad-request"
  | "conflict"
  | "not-found"
  | "expired"
  | "server"
  | "network";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: {
      cause?: unknown;
      status?: number | null;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = options.status ?? null;
  }
}

export interface ApiRequestOptions {
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
}

interface MutationRequestOptions extends ApiRequestOptions {
  expectedVersion: number;
}

interface Schema<T> {
  parse(value: unknown): T;
}

interface RequestJsonOptions<TBody> extends ApiRequestOptions {
  body?: TBody;
  bodySchema?: Schema<TBody>;
  expectedVersion?: number;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
}

const NETWORK_ERROR_MESSAGE =
  "We couldn't reach SettleUp. Check your connection and try again.";
const SERVER_ERROR_MESSAGE = "SettleUp returned an unexpected response. Try again.";

export function createEvent(
  command: CreateEventCommand,
  options?: ApiRequestOptions,
): Promise<CreateEventResponse> {
  return requestJson("/api/events", createEventResponseSchema, {
    ...options,
    body: command,
    bodySchema: createEventCommandSchema,
    method: "POST",
  });
}

export function getEvent(
  token: string,
  options?: ApiRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(eventPath(token), eventSnapshotSchema, options);
}

export function addParticipant(
  token: string,
  command: ParticipantCommand,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(`${eventPath(token)}/participants`, eventSnapshotSchema, {
    ...options,
    body: command,
    bodySchema: participantCommandSchema,
    method: "POST",
  });
}

export function renameParticipant(
  token: string,
  participantId: string,
  command: ParticipantCommand,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(
    `${eventPath(token)}/participants/${encodePathSegment(participantId)}`,
    eventSnapshotSchema,
    {
      ...options,
      body: command,
      bodySchema: participantCommandSchema,
      method: "PATCH",
    },
  );
}

export function deleteParticipant(
  token: string,
  participantId: string,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(
    `${eventPath(token)}/participants/${encodePathSegment(participantId)}`,
    eventSnapshotSchema,
    {
      ...options,
      method: "DELETE",
    },
  );
}

export function createExpense(
  token: string,
  command: ExpenseCommand,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(`${eventPath(token)}/expenses`, eventSnapshotSchema, {
    ...options,
    body: command,
    bodySchema: expenseCommandSchema,
    method: "POST",
  });
}

export function updateExpense(
  token: string,
  expenseId: string,
  command: ExpenseCommand,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(
    `${eventPath(token)}/expenses/${encodePathSegment(expenseId)}`,
    eventSnapshotSchema,
    {
      ...options,
      body: command,
      bodySchema: expenseCommandSchema,
      method: "PATCH",
    },
  );
}

export function deleteExpense(
  token: string,
  expenseId: string,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(
    `${eventPath(token)}/expenses/${encodePathSegment(expenseId)}`,
    eventSnapshotSchema,
    {
      ...options,
      method: "DELETE",
    },
  );
}

export function createPayment(
  token: string,
  command: PaymentCommand,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(`${eventPath(token)}/payments`, eventSnapshotSchema, {
    ...options,
    body: command,
    bodySchema: paymentCommandSchema,
    method: "POST",
  });
}

export function updatePayment(
  token: string,
  paymentId: string,
  command: PaymentCommand,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(
    `${eventPath(token)}/payments/${encodePathSegment(paymentId)}`,
    eventSnapshotSchema,
    {
      ...options,
      body: command,
      bodySchema: paymentCommandSchema,
      method: "PATCH",
    },
  );
}

export function deletePayment(
  token: string,
  paymentId: string,
  options: MutationRequestOptions,
): Promise<EventSnapshot> {
  return requestJson(
    `${eventPath(token)}/payments/${encodePathSegment(paymentId)}`,
    eventSnapshotSchema,
    {
      ...options,
      method: "DELETE",
    },
  );
}

async function requestJson<TResponse, TBody = never>(
  path: string,
  responseSchema: Schema<TResponse>,
  options: RequestJsonOptions<TBody> = {},
): Promise<TResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  let body: string | undefined;
  let headers: Record<string, string>;
  let response: Response;

  try {
    body =
      options.body === undefined
        ? undefined
        : JSON.stringify(
            options.bodySchema ? options.bodySchema.parse(options.body) : options.body,
          );
    headers =
      body === undefined
        ? { Accept: "application/json" }
        : {
            Accept: "application/json",
            "Content-Type": "application/json",
          };

    if (options.expectedVersion !== undefined) {
      if (
        !Number.isSafeInteger(options.expectedVersion) ||
        options.expectedVersion <= 0
      ) {
        throw new Error("Expected event version must be a positive integer.");
      }
      headers["If-Match"] = `"v${options.expectedVersion}"`;
    }
  } catch (error) {
    throw new ApiError("bad-request", schemaErrorMessage(error), {
      cause: error,
      status: 400,
    });
  }

  try {
    response = await fetchImplementation(path, {
      body,
      cache: "no-store",
      credentials: "omit",
      headers,
      method: options.method ?? "GET",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError("network", NETWORK_ERROR_MESSAGE, { cause: error });
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error
      : fallbackMessageForStatus(response.status);

    throw new ApiError(kindForStatus(response.status), message, {
      status: response.status,
    });
  }

  try {
    return responseSchema.parse(payload);
  } catch (error) {
    throw new ApiError("server", SERVER_ERROR_MESSAGE, {
      cause: error,
      status: response.status,
    });
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (response.ok) {
      throw new ApiError("server", SERVER_ERROR_MESSAGE, {
        cause: error,
        status: response.status,
      });
    }

    return undefined;
  }
}

function eventPath(token: string): string {
  return `/api/events/${encodePathSegment(token)}`;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function kindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return "bad-request";
    case 404:
      return "not-found";
    case 409:
    case 412:
      return "conflict";
    case 410:
      return "expired";
    default:
      return "server";
  }
}

function fallbackMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Check the highlighted details and try again.";
    case 404:
      return "This event or item could not be found.";
    case 409:
    case 412:
      return "This event changed. Load the latest version and try again.";
    case 410:
      return "This event link has expired.";
    default:
      return SERVER_ERROR_MESSAGE;
  }
}

function schemaErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray(error.issues)
  ) {
    const firstIssue = error.issues[0] as unknown;

    if (
      typeof firstIssue === "object" &&
      firstIssue !== null &&
      "message" in firstIssue &&
      typeof firstIssue.message === "string"
    ) {
      return firstIssue.message;
    }
  }

  return fallbackMessageForStatus(400);
}
