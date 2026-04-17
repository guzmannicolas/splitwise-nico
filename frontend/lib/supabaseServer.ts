import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type GetServerSidePropsContext } from 'next'

/**
 * Crea un cliente de Supabase para ser usado en el servidor (getServerSideProps)
 * Maneja la lectura y escritura de sesiones a través de cookies.
 */
export function createSupabaseServerClient(context: GetServerSidePropsContext) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=Lax`)
        },
        remove(name: string) {
          context.res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`)
        },
      },
    }
  )
}
