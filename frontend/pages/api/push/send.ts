import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing Supabase env vars for push sender')
}

if (!VAPID_PRIVATE || !VAPID_PUBLIC) {
  console.warn('Missing VAPID keys for push sender')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

try {
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails('mailto:notifications@yourdomain.com', VAPID_PUBLIC, VAPID_PRIVATE)
  }
} catch (err) {
  console.warn('web-push init error', err)
}

type Body = {
  user_id?: string
  group_id?: string
  endpoint?: string
  title?: string
  body?: string
  url?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body: Body = req.body || {}
  const { user_id, group_id, endpoint, title = 'Nueva notificación', body: bodyText = '', url = '/' } = body

  try {
    let subs: Array<any> = []

    if (endpoint) {
      // direct endpoint
      const { data } = await supabaseAdmin.from('push_subscriptions').select('*').eq('endpoint', endpoint).limit(1)
      subs = data || []
    } else if (group_id) {
      // try optional RPC helper, otherwise fallback to join
      const { data } = await supabaseAdmin.rpc('select_push_subscriptions_for_group', { p_group_id: group_id })
      if (data && data.length) {
        subs = data
      } else {
        const q = await supabaseAdmin
          .from('push_subscriptions as ps')
          .select('ps.*')
          .eq('ps.user_id', 'ps.user_id')
        // fallback simple join
        const join = await supabaseAdmin.rpc('select_push_subscriptions_for_group_simple', { p_group_id: group_id })
        subs = (join && join.data) || []
      }
    } else if (user_id) {
      const { data } = await supabaseAdmin.from('push_subscriptions').select('*').eq('user_id', user_id)
      subs = data || []
    } else {
      return res.status(400).json({ error: 'Missing target (user_id, group_id or endpoint)' })
    }

    if (!subs.length) {
      return res.status(200).json({ success: true, sent: 0, message: 'No subscriptions found' })
    }

    const payload = JSON.stringify({ title, body: bodyText, url })

    const results = await Promise.allSettled(
      subs.map((s) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth_key }
        }
        return webpush.sendNotification(subscription, payload)
      })
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason?.message || String(r))

    return res.status(200).json({ success: true, sent, failed })
  } catch (err: any) {
    console.error('Push send error', err)
    return res.status(500).json({ error: err?.message || String(err) })
  }
}
