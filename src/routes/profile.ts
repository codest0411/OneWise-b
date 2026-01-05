import { Router } from 'express'
import { z } from 'zod'
import { getProfileById, upsertProfile } from '../services/profile'
import { HttpError } from '../utils/httpError'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new HttpError(401, 'Not authenticated')
    }

    const profile = await getProfileById(req.user.id)
    res.json({ data: profile })
  } catch (err) {
    next(err)
  }
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  headline: z.string().min(1).max(160).optional(),
  bio: z.string().max(2000).optional(),
  avatar_url: z.string().url().optional(),
})

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new HttpError(401, 'Not authenticated')
    }

    const payload = updateSchema.parse(req.body ?? {})
    const profile = await upsertProfile(req.user.id, payload)
    res.json({ data: profile })
  } catch (err) {
    next(err)
  }
})

export default router
