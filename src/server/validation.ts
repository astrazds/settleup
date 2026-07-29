import { badRequest } from "./errors.js";

interface ValidationIssue {
  message: string;
}

interface SafeParseFailure {
  success: false;
  error: {
    issues: ValidationIssue[];
  };
}

interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

interface RequestSchema<T> {
  safeParse(value: unknown): SafeParseFailure | SafeParseSuccess<T>;
}

export function parseRequestBody<T>(schema: RequestSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message ?? "Request body is invalid.");
  }

  return result.data;
}
