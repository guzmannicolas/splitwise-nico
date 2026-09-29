export async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch('/api/verify-turnstile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await res.json()
  return data.success === true
}
