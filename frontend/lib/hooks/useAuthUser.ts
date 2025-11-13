import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export interface AuthUser {
  id: string
  email: string | null
  fullName?: string | null
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }
      // fetch profile for full_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (mounted) {
        setUser({ id: user.id, email: user.email ?? null, fullName: profile?.full_name ?? null })
        setLoading(false)
      }
    }

    load()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
      } else {
        setUser({ id: session.user.id, email: session.user.email ?? null })
      }
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
