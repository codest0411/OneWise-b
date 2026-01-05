export type UserRole = 'mentor' | 'student'

export type Profile = {
  id: string
  name: string | null
  role: UserRole | null
  headline: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export type MentorshipSession = {
  id: string
  title: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  scheduled_at: string | null
  duration_minutes: number | null
  created_at: string
  created_by: string
  summary: string | null
}

export type SessionParticipant = {
  id: string
  session_id: string
  user_id: string
  role: UserRole
  joined_at: string
}

export type SessionMessage = {
  id: string
  session_id: string
  author_id: string
  content: string
  created_at: string
}

export type SessionCodeSnapshot = {
  id: string
  session_id: string
  author_id: string
  language: string
  code: string
  created_at: string
}

export type AuthedUser = {
  id: string
  email?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
  role?: UserRole
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser
    }
  }
}
