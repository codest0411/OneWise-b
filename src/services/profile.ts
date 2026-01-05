import type { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabase'
import { HttpError } from '../utils/httpError'
import type { Profile } from '../types'

const PROFILE_SELECT = 'id,name,role,headline,bio,avatar_url,created_at'

const formatPostgrestError = (error: PostgrestError | null) => {
  if (!error) return undefined
  const { message, details, hint, code } = error
  return { message, details, hint, code }
}

export async function getProfileById(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin.from('profiles').select(PROFILE_SELECT).eq('id', userId).single()
  if (error) {
    throw new HttpError(error.code === 'PGRST116' ? 404 : 500, 'Unable to load profile', formatPostgrestError(error))
  }
  return data as Profile
}

type UpdateProfileInput = Pick<Profile, 'name' | 'headline' | 'bio' | 'avatar_url'>

export async function upsertProfile(userId: string, payload: Partial<UpdateProfileInput>): Promise<Profile> {
  const update = {
    id: userId,
    ...payload,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(update, { onConflict: 'id' })
    .select(PROFILE_SELECT)
    .single()

  if (error) {
    throw new HttpError(500, 'Unable to update profile', formatPostgrestError(error))
  }

  return data as Profile
}
