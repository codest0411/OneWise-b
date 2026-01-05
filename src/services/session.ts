import type { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabase'
import { HttpError } from '../utils/httpError'

const SESSION_SELECT =
  'id,title,status,scheduled_at,duration_minutes,created_at,created_by,summary,invite_code,allow_collab,allow_chat,allow_video,metadata,participants:session_participants(id,user_id,role,joined_at,kicked_at,can_edit,can_share_screen)'

type JsonRecord = Record<string, any>

type ParticipantRow = {
  session_id: string
  user_id: string
  role: string
  kicked_at: string | null
}

export type SessionCreateInput = {
  title: string
  summary?: string | null
  scheduled_at?: string | null
  duration_minutes?: number | null
  allow_collab?: boolean
  allow_chat?: boolean
  allow_video?: boolean
  metadata?: JsonRecord | null
  participantUserIds?: string[]
}

export type SessionUpdateInput = {
  title?: string
  summary?: string | null
  scheduled_at?: string | null
  duration_minutes?: number | null
  status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
  allow_collab?: boolean
  allow_chat?: boolean
  allow_video?: boolean
  metadata?: JsonRecord | null
}

export const formatPostgrestError = (error: PostgrestError | null) => {
  if (!error) return undefined
  const { message, details, hint, code } = error
  return { message, details, hint, code }
}

export async function listSessionsForUser(userId: string) {
  const { data: participantRows, error: participantError } = await supabaseAdmin
    .from('session_participants')
    .select('session_id')
    .eq('user_id', userId)

  if (participantError) {
    throw new HttpError(500, 'Unable to load session memberships', formatPostgrestError(participantError))
  }

  const sessionIds = [...new Set(participantRows?.map((row) => row.session_id) ?? [])]
  if (sessionIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .select(SESSION_SELECT)
    .in('id', sessionIds)
    .order('scheduled_at', { ascending: true, nullsFirst: true })

  if (error) {
    throw new HttpError(500, 'Unable to load sessions', formatPostgrestError(error))
  }

  return data
}

export async function ensureSessionParticipant(userId: string, sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('session_participants')
    .select('user_id,role,kicked_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to verify session access', formatPostgrestError(error))
  }

  if (!data) {
    throw new HttpError(403, 'You are not a participant in this session')
  }

  if (data.kicked_at) {
    throw new HttpError(403, 'You have been removed from this session')
  }

  return data as ParticipantRow
}

export async function getSessionForUser(userId: string, sessionId: string) {
  await ensureSessionParticipant(userId, sessionId)

  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .select(SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to load session', formatPostgrestError(error))
  }

  if (!data) {
    throw new HttpError(404, 'Session not found')
  }

  return data
}

export async function addSessionMessage(sessionId: string, userId: string, content: string) {
  await ensureSessionParticipant(userId, sessionId)

  const { error } = await supabaseAdmin.from('session_messages').insert({
    session_id: sessionId,
    author_id: userId,
    content,
  })

  if (error) {
    throw new HttpError(500, 'Unable to store message', formatPostgrestError(error))
  }
}

export async function addCodeSnapshot(sessionId: string, userId: string, code: string, language: string) {
  await ensureSessionParticipant(userId, sessionId)

  const { error } = await supabaseAdmin.from('session_code_snapshots').insert({
    session_id: sessionId,
    author_id: userId,
    language,
    code,
  })

  if (error) {
    throw new HttpError(500, 'Unable to store code snapshot', formatPostgrestError(error))
  }
}

const emptyObject: JsonRecord = {}

const sanitizeMetadata = (metadata?: JsonRecord | null) => metadata ?? emptyObject

const ensureSessionExistsWithOwner = async (sessionId: string) => {
  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .select('id, created_by')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to load session', formatPostgrestError(error))
  }

  if (!data) {
    throw new HttpError(404, 'Session not found')
  }

  return data
}

export async function createSession(mentorId: string, input: SessionCreateInput) {
  const sessionPayload = {
    title: input.title,
    summary: input.summary ?? null,
    scheduled_at: input.scheduled_at ?? null,
    duration_minutes: input.duration_minutes ?? null,
    allow_collab: input.allow_collab ?? true,
    allow_chat: input.allow_chat ?? true,
    allow_video: input.allow_video ?? true,
    metadata: sanitizeMetadata(input.metadata),
    created_by: mentorId,
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('mentorship_sessions')
    .insert(sessionPayload)
    .select(SESSION_SELECT)
    .single()

  if (sessionError || !session) {
    throw new HttpError(500, 'Unable to create session', formatPostgrestError(sessionError))
  }

  const uniqueStudentIds = Array.from(new Set((input.participantUserIds ?? []).filter((id) => id && id !== mentorId)))

  const participantRows = [
    {
      session_id: session.id,
      user_id: mentorId,
      role: 'mentor',
      can_edit: true,
      can_share_screen: true,
    },
    ...uniqueStudentIds.map((userId) => ({
      session_id: session.id,
      user_id: userId,
      role: 'student',
    })),
  ]

  const { error: participantError } = await supabaseAdmin.from('session_participants').insert(participantRows)

  if (participantError) {
    await supabaseAdmin.from('mentorship_sessions').delete().eq('id', session.id)
    throw new HttpError(500, 'Unable to attach participants', formatPostgrestError(participantError))
  }

  return session
}

export async function joinSessionByCode(userId: string, inviteCode: string) {
  const { data: session, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .select('id, created_by, status, invite_code')
    .eq('invite_code', inviteCode)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to look up session', formatPostgrestError(error))
  }

  if (!session) {
    throw new HttpError(404, 'No session found for that code')
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    throw new HttpError(400, 'This session is no longer accepting participants')
  }

  const { data: existing, error: membershipError } = await supabaseAdmin
    .from('session_participants')
    .select('id,kicked_at')
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    throw new HttpError(500, 'Unable to verify membership', formatPostgrestError(membershipError))
  }

  if (existing?.kicked_at) {
    throw new HttpError(403, 'You have been removed from this session')
  }

  if (!existing) {
    const { error: insertError } = await supabaseAdmin.from('session_participants').insert({
      session_id: session.id,
      user_id: userId,
      role: userId === session.created_by ? 'mentor' : 'student',
    })

    if (insertError) {
      throw new HttpError(500, 'Unable to join session', formatPostgrestError(insertError))
    }
  }

  return session
}

export async function updateSessionSettings(mentorId: string, sessionId: string, updates: SessionUpdateInput) {
  const patch: JsonRecord = {}

  if (updates.title !== undefined) patch.title = updates.title
  if (updates.summary !== undefined) patch.summary = updates.summary
  if (updates.scheduled_at !== undefined) patch.scheduled_at = updates.scheduled_at
  if (updates.duration_minutes !== undefined) patch.duration_minutes = updates.duration_minutes
  if (updates.status !== undefined) patch.status = updates.status
  if (updates.allow_collab !== undefined) patch.allow_collab = updates.allow_collab
  if (updates.allow_chat !== undefined) patch.allow_chat = updates.allow_chat
  if (updates.allow_video !== undefined) patch.allow_video = updates.allow_video
  if (updates.metadata !== undefined) patch.metadata = sanitizeMetadata(updates.metadata)

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'No updates were provided')
  }

  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .update(patch)
    .eq('id', sessionId)
    .eq('created_by', mentorId)
    .select(SESSION_SELECT)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to update session', formatPostgrestError(error))
  }

  if (!data) {
    throw new HttpError(404, 'Session not found or you do not have permission to update it')
  }

  return data
}

export async function kickParticipant(mentorId: string, sessionId: string, targetUserId: string) {
  const session = await ensureSessionExistsWithOwner(sessionId)

  if (session.created_by !== mentorId) {
    throw new HttpError(403, 'Only the session creator can remove participants')
  }

  if (targetUserId === mentorId) {
    throw new HttpError(400, 'You cannot remove yourself from your own session')
  }

  const { data, error } = await supabaseAdmin
    .from('session_participants')
    .update({
      kicked_at: new Date().toISOString(),
      can_edit: false,
      can_share_screen: false,
    })
    .eq('session_id', sessionId)
    .eq('user_id', targetUserId)
    .is('kicked_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to remove participant', formatPostgrestError(error))
  }

  if (!data) {
    throw new HttpError(404, 'Participant not found or already removed')
  }

  return true
}

type PermissionChanges = {
  can_edit?: boolean
  can_share_screen?: boolean
}

export async function updateParticipantPermissions(
  mentorId: string,
  sessionId: string,
  targetUserId: string,
  changes: PermissionChanges
) {
  const session = await ensureSessionExistsWithOwner(sessionId)

  if (session.created_by !== mentorId) {
    throw new HttpError(403, 'Only the session creator can update participant permissions')
  }

  const patch: Record<string, boolean> = {}
  if (changes.can_edit !== undefined) patch.can_edit = changes.can_edit
  if (changes.can_share_screen !== undefined) patch.can_share_screen = changes.can_share_screen

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'No permission changes provided')
  }

  const { data, error } = await supabaseAdmin
    .from('session_participants')
    .update(patch)
    .eq('session_id', sessionId)
    .eq('user_id', targetUserId)
    .select('user_id,role,can_edit,can_share_screen')
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'Unable to update participant permissions', formatPostgrestError(error))
  }

  if (!data) {
    throw new HttpError(404, 'Participant not found')
  }

  return data
}
