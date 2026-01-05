import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { HttpError } from '../utils/httpError'
import {
  addCodeSnapshot,
  addSessionMessage,
  createSession,
  ensureSessionParticipant,
  formatPostgrestError,
  getSessionForUser,
  joinSessionByCode,
  kickParticipant,
  listSessionsForUser,
  updateParticipantPermissions,
  updateSessionSettings,
} from '../services/session'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const sessionSelect =
  'id,title,status,scheduled_at,duration_minutes,created_at,created_by,summary,participants:session_participants(id,user_id,role,joined_at)'

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')

    const sessions = await listSessionsForUser(req.user.id)
    res.json({ data: sessions })
  } catch (err) {
    next(err)
  }
})

const createSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(1).max(2000).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().positive().max(600).optional(),
  allow_collab: z.boolean().optional(),
  allow_chat: z.boolean().optional(),
  allow_video: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  participant_ids: z.array(z.string().uuid()).optional(),
})

const joinSchema = z.object({
  code: z.string().min(4).max(32),
})

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  summary: z.string().min(1).max(2000).nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  duration_minutes: z.number().int().positive().max(600).nullable().optional(),
  status: z.enum(['scheduled', 'live', 'completed', 'cancelled']).optional(),
  allow_collab: z.boolean().optional(),
  allow_chat: z.boolean().optional(),
  allow_video: z.boolean().optional(),
  metadata: z.record(z.any()).nullable().optional(),
})

const kickSchema = z.object({
  user_id: z.string().uuid(),
})

const permissionSchema = z.object({
  user_id: z.string().uuid(),
  can_edit: z.boolean().optional(),
  can_share_screen: z.boolean().optional(),
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')
    if (req.user.role !== 'mentor') throw new HttpError(403, 'Only mentors can create sessions')

    const payload = createSchema.parse(req.body ?? {})

    const session = await createSession(req.user.id, {
      title: payload.title,
      summary: payload.summary,
      scheduled_at: payload.scheduled_at,
      duration_minutes: payload.duration_minutes,
      allow_collab: payload.allow_collab,
      allow_chat: payload.allow_chat,
      allow_video: payload.allow_video,
      metadata: payload.metadata,
      participantUserIds: payload.participant_ids,
    })

    res.status(201).json({ data: session })
  } catch (err) {
    next(err)
  }
})

router.post('/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')

    const { code } = joinSchema.parse(req.body ?? {})

    const session = await joinSessionByCode(req.user.id, code)

    res.status(200).json({ data: { session_id: session.id } })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')

    const session = await getSessionForUser(req.user.id, req.params.id)

    res.json({ data: session })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')

    const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body ?? {})

    await addSessionMessage(req.params.id, req.user.id, message)

    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')
    if (req.user.role !== 'mentor') throw new HttpError(403, 'Only mentors can update sessions')

    const updates = updateSchema.parse(req.body ?? {})
    const session = await updateSessionSettings(req.user.id, req.params.id, updates)

    res.json({ data: session })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/kick', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')
    if (req.user.role !== 'mentor') throw new HttpError(403, 'Only mentors can manage roster')

    const { user_id } = kickSchema.parse(req.body ?? {})
    await kickParticipant(req.user.id, req.params.id, user_id)

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

router.post('/:id/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')
    if (req.user.role !== 'mentor') throw new HttpError(403, 'Only mentors can manage permissions')

    const payload = permissionSchema.parse(req.body ?? {})

    const participant = await updateParticipantPermissions(req.user.id, req.params.id, payload.user_id, {
      can_edit: payload.can_edit,
      can_share_screen: payload.can_share_screen,
    })

    res.json({ data: participant })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw new HttpError(401, 'Not authenticated')

    const payload = z
      .object({
        language: z.string().optional(),
        code: z.string().min(1),
      })
      .parse(req.body ?? {})

    await addCodeSnapshot(req.params.id, req.user.id, payload.code, payload.language ?? 'javascript')

    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
