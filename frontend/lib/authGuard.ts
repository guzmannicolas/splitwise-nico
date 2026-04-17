import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import { createSupabaseServerClient } from './supabaseServer'

interface AuthGuardResult {
  user: { id: string; email: string | null }
  supabase: ReturnType<typeof createSupabaseServerClient>
}

/**
 * Guard de autenticación para getServerSideProps.
 * Redirige a /auth/login si no hay sesión activa.
 */
export async function requireAuth(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<any> | AuthGuardResult> {
  const supabase = createSupabaseServerClient(context)
  
  // Usamos getUser() en lugar de getSession() para mayor seguridad (valida con Supabase)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    supabase,
  }
}

/**
 * Guard inverso: redirige a /dashboard si ya existe una sesión.
 * Ideal para páginas de login o registro.
 */
export async function redirectIfAuthed(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<any> | null> {
  const supabase = createSupabaseServerClient(context)
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }

  return null // No hay sesión, continuar con la página
}
