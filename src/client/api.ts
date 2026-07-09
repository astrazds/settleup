import type { CurrencyCode, EventSnapshot } from "../shared/domain.js";

interface CreateEventRequest {
  title: string;
  currency: CurrencyCode;
  firstParticipantName: string;
}

interface CreateEventResponse {
  token: string;
  snapshot: EventSnapshot;
}

interface ParticipantRequest {
  name: string;
}

interface ExpenseRequest {
  description: string;
  amountMinor: number;
  payerId: string;
  includedParticipantIds: string[];
}

interface PaymentRequest {
  from: string;
  to: string;
  amountMinor: number;
}

export async function createEvent(request: CreateEventRequest): Promise<CreateEventResponse> {
  return requestJson("/api/events", "POST", request);
}

export async function getEvent(token: string): Promise<EventSnapshot> {
  return fetchJson(`/api/events/${token}`);
}

export async function addParticipant(token: string, request: ParticipantRequest): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/participants`, "POST", request);
}

export async function renameParticipant(
  token: string,
  participantId: string,
  request: ParticipantRequest,
): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/participants/${participantId}`, "PATCH", request);
}

export async function deleteParticipant(token: string, participantId: string): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/participants/${participantId}`, "DELETE");
}

export async function createExpense(token: string, request: ExpenseRequest): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/expenses`, "POST", request);
}

export async function updateExpense(
  token: string,
  expenseId: string,
  request: ExpenseRequest,
): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/expenses/${expenseId}`, "PATCH", request);
}

export async function deleteExpense(token: string, expenseId: string): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/expenses/${expenseId}`, "DELETE");
}

export async function createPayment(token: string, request: PaymentRequest): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/payments`, "POST", request);
}

export async function updatePayment(
  token: string,
  paymentId: string,
  request: PaymentRequest,
): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/payments/${paymentId}`, "PATCH", request);
}

export async function deletePayment(token: string, paymentId: string): Promise<EventSnapshot> {
  return requestJson(`/api/events/${token}/payments/${paymentId}`, "DELETE");
}

async function requestJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    method,
  });
  return parseResponse<T>(response);
}

async function fetchJson<T>(path: string): Promise<T> {
  return parseResponse<T>(await fetch(path));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null) as unknown;

  if (!response.ok) {
    const message = getErrorMessage(value) ?? `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return value as T;
}

function getErrorMessage(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = value.error;
    return typeof error === "string" ? error : null;
  }

  return null;
}
