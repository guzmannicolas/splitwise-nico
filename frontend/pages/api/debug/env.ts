import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // IMPORTANT: do NOT return secret values. Only return booleans for presence.
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  return res.status(200).json({ hasSupabaseUrl, hasServiceRole, hasVapidPublic })
}
