export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 410 | 412,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message: string): AppError {
  return new AppError(message, 404);
}

export function badRequest(message: string): AppError {
  return new AppError(message, 400);
}

export function expired(message: string): AppError {
  return new AppError(message, 410);
}

export function preconditionFailed(message: string): AppError {
  return new AppError(message, 412);
}
