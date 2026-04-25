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
          const cookieStr = `${name}=${value}; Path=${options.path || '/'}; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}; max-age=${options.maxAge || ''}`
          try {
            context.res.appendHeader('Set-Cookie', cookieStr)
          } catch (e) {
            let existing = context.res.getHeader('Set-Cookie') ?? []
            if (typeof existing === 'string') existing = [existing]
            context.res.setHeader('Set-Cookie', [...(existing as string[]), cookieStr])
          }
        },
        remove(name: string, options: CookieOptions) {
          const cookieStr = `${name}=; Path=${options.path || '/'}; Max-Age=0`
          try {
            context.res.appendHeader('Set-Cookie', cookieStr)
          } catch (e) {
            let existing = context.res.getHeader('Set-Cookie') ?? []
            if (typeof existing === 'string') existing = [existing]
            context.res.setHeader('Set-Cookie', [...(existing as string[]), cookieStr])
          }
        },
      },
    }
  )
}
