import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import { createSupabaseServerClient } from './supabaseServer'

interface AuthGuardResult {
  user: { id: string; email: string | null }
  supabase: ReturnType<typeof createSupabaseServerClient>
}

/**
 * Authentication guard for getServerSideProps.
 * Redirects to /auth/login if there is no active session.
 */
export async function requireAuth(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<any> | AuthGuardResult> {
  const supabase = createSupabaseServerClient(context)
  
  // Use getUser() instead of getSession() for stronger security (validates with Supabase)
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
 * Inverse guard: redirects to /dashboard if a session already exists.
 * Intended for login and registration pages.
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

  return null // No session, continue to the page
}
