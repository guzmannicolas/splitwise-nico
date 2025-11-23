import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type Body = {
  user_id?: string | null
  endpoint: string
  p256dh: string
  auth_key: string
  ua?: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Do not create the Supabase client at module import time — if env vars are missing
// this can throw and cause Next to render an error page. Create it lazily inside
// the handler and return a clear JSON error when required env vars are missing.
let supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  return supabaseAdmin
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  // Allow credentials if the client sends them
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    // Return debugging info to help identify why a non-POST/OPTIONS request arrived.
    // Remove or reduce verbosity after debugging is complete.
    return res.status(405).json({ error: 'Method not allowed', method: req.method, headers: req.headers })
  }

  let body: Body
  try {
    body = req.body
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { user_id = null, endpoint, p256dh, auth_key, ua = null } = body || {}

  if (!endpoint || !p256dh || !auth_key) {
    return res.status(400).json({ error: 'Missing subscription fields' })
  }

  try {
    const payload = {
      user_id,
      endpoint,
      p256dh,
      auth_key,
      ua,
      created_at: new Date().toISOString(),
    }

    const supabaseClient = getSupabaseAdmin()
    if (!supabaseClient) {
      return res.status(500).json({ error: 'Missing SUPABASE env vars on server (SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_URL)' })
    }

    const { data, error } = await supabaseClient
      .from('push_subscriptions')
      .upsert(payload as any, { onConflict: 'endpoint' })
      .select()

    if (error) {
      console.error('Supabase upsert error', error)
      // Return error details to help debugging (temporary)
      return res.status(500).json({ error: 'Failed to save subscription', details: error })
    }

    return res.status(200).json({ success: true, subscription: data?.[0] ?? null })
  } catch (err) {
    console.error('Subscribe handler error', err)
    return res.status(500).json({ error: 'Internal error', details: String(err) })
  }
}
