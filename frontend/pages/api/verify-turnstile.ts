import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token } = req.body
  if (!token) return res.status(400).json({ success: false, error: 'Missing token' })

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return res.status(500).json({ success: false, error: 'Turnstile not configured' })

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  })

  const data = await response.json()
  if (!data.success) {
    console.error('[Turnstile] Verification failed:', data['error-codes'])
  }
  return res.status(200).json({ success: data.success === true })
}
