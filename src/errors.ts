export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
  }
}
