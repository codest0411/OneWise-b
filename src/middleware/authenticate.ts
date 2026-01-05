import type { NextFunction, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { HttpError } from '../utils/httpError'
import type { UserRole } from '../types'

const EXEMPT_PATHS = new Set(['/health'])

const isUserRole = (value?: string | null): value is UserRole => value === 'mentor' || value === 'student'

const resolveRole = async (user: any): Promise<UserRole | undefined> => {
  const fromMetadata =
    (user?.user_metadata as Record<string, any> | undefined)?.role ??
    (user?.app_metadata as Record<string, any> | undefined)?.role

  if (isUserRole(fromMetadata)) return fromMetadata

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to resolve profile role', { hint: error.message })
  }

  const role = data?.role
  return isUserRole(role) ? role : undefined
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  if (EXEMPT_PATHS.has(req.path)) {
    return next()
  }

  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing bearer token'))
  }

  const token = header.replace('Bearer', '').trim()
  if (!token) {
    return next(new HttpError(401, 'Invalid bearer token'))
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) {
      return next(new HttpError(401, 'Invalid or expired session'))
    }

    const role = await resolveRole(data.user)

    req.user = {
      ...data.user,
      role,
    }

    return next()
  } catch (err) {
    return next(
      err instanceof HttpError ? err : new HttpError(500, 'Unable to validate session', { cause: (err as Error).message })
    )
  }
}
