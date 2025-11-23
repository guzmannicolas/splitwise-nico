import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Lazy create client to avoid throwing at module init if env missing
let supabaseAdmin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  return supabaseAdmin
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS preflight
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { endpoint, user_id } = req.body || {}
  if (!endpoint && !user_id) {
    return res.status(400).json({ error: 'endpoint or user_id required' })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return res.status(500).json({ error: 'Missing SUPABASE env vars on server (SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_URL)' })
  }

  try {
    let query = supabase.from('push_subscriptions').delete()
    if (endpoint) query = query.eq('endpoint', endpoint)
    if (user_id && !endpoint) query = query.eq('user_id', user_id)

    const { data, error } = await query
    if (error) {
      console.error('Unsubscribe supabase error', error)
      return res.status(500).json({ error: 'Failed to remove subscription', details: error })
    }

    const removed = Array.isArray(data as any) ? (data as any).length : (data ? 1 : 0)
    if (removed === 0) {
      console.warn('Unsubscribe: no rows removed for', { endpoint: !!endpoint, user_id: !!user_id })
    }

    return res.status(200).json({ success: true, removed })
  } catch (err) {
    console.error('Unsubscribe handler error', err)
    return res.status(500).json({ error: 'Internal server error', details: String(err) })
  }
}
