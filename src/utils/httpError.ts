export class HttpError extends Error {
  status: number
  details?: Record<string, unknown> | string

  constructor(status: number, message: string, details?: Record<string, unknown> | string) {
    super(message)
    this.status = status
    this.details = details
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

export const createHttpError = (status: number, message: string, details?: Record<string, unknown> | string) =>
  new HttpError(status, message, details)
