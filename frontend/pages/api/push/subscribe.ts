import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type Body = {
  user_id?: string | null
  endpoint: string
  p256dh: string
  auth_key: string
  ua?: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // This file will still load, but requests will fail with a clear message
  console.warn('Missing SUPABASE env vars for push subscribe endpoint')
}

const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'endpoint' })
      .select()

    if (error) {
      console.error('Supabase upsert error', error)
      return res.status(500).json({ error: 'Failed to save subscription' })
    }

    return res.status(200).json({ success: true, subscription: data?.[0] ?? null })
  } catch (err) {
    console.error('Subscribe handler error', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
