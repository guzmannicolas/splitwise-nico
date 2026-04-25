import { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseServerClient } from '../../../lib/supabaseServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code

  if (typeof code === 'string') {
    // Usamos el mismo cliente que en getServerSideProps (API Routes tienen req y res compatibles)
    const supabase = createSupabaseServerClient({ req, res } as any)
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Error in callback exchange:', error)
      return res.redirect('/auth/login?error=ExchangeFailed')
    }
  }

  // Redirigir al dashboard una vez completado el intercambio
  res.redirect('/dashboard')
}
