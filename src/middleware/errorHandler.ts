import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/httpError'
import { logger } from '../logger'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    logger.warn(`Handled HTTP error: ${err.message}`, err.details ? { details: err.details } : undefined)
    return res.status(err.status).json({
      message: err.message,
      details: err.details,
    })
  }

  const meta =
    err && typeof err === 'object'
      ? (err as Record<string, unknown>)
      : err != null
        ? { err }
        : undefined
  logger.error('Unhandled error', meta)

  return res.status(500).json({
    message: 'Unexpected server error',
  })
}
