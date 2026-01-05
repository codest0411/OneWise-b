import { config as loadEnv } from 'dotenv'

loadEnv()

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[env] Missing required environment variable ${key}`)
  }
})

const number = (value: string | undefined, fallback: number) => {
  const parsed = value ? parseInt(value, 10) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseCsv = (value: string | undefined, fallback: string[]) =>
  value?.split(',').map((item) => item.trim()).filter(Boolean) ?? fallback

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: number(process.env.PORT, 4000),
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  cors: {
    allowedOrigins: parseCsv(process.env.FRONTEND_ORIGIN, ['http://localhost:3000']),
  },
  socket: {
    allowedOrigins: parseCsv(process.env.SOCKET_CORS_ORIGINS, ['http://localhost:3000']),
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
}

if (!env.supabase.url || !env.supabase.serviceRoleKey) {
  throw new Error('Supabase credentials are required. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}
