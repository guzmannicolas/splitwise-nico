import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '../hooks/useTheme'
import BottomNav from './BottomNav'

export default function Layout({ 
  children, 
  hideAuthLinks, 
  serverUser,
  fluid = false
}: { 
  children: React.ReactNode, 
  hideAuthLinks?: boolean,
  serverUser?: { id: string; email: string | null } | null,
  fluid?: boolean
}) {
  const [user, setUser] = useState<any>(serverUser || null)
  const router = useRouter()
  const [loading, setLoading] = useState(!serverUser)
  const [displayName, setDisplayName] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState<boolean>(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [showNavbar, setShowNavbar] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const { theme, toggleTheme, mounted } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function fetchDisplayName() {
      try {
        if (!user) { setDisplayName(''); return }
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        if (!error && data?.full_name) setDisplayName(data.full_name)
        else setDisplayName(user.email || 'Mi cuenta')
      } catch {
        setDisplayName(user?.email || 'Mi cuenta')
      }
    }
    fetchDisplayName()
  }, [user])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < lastScrollY) {
        setShowNavbar(true)
      }
      else if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setShowNavbar(false)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlNavbar)
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      <div className="min-h-screen border-blue-100 dark:border-slate-800 rounded-2xl overflow-hidden pb-16 lg:pb-0">
      <nav className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-none border-b border-blue-100 dark:border-slate-800 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showNavbar ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href={user ? "/dashboard" : "/"} className="flex items-center text-blue-700 dark:text-blue-400 font-bold text-xl">
                💸 Dividi2
              </Link>
            </div>
            
            {(user || !hideAuthLinks) && (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-amber-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  aria-label="Cambiar tema"
                >
                  {theme === 'dark' ? (
                    <span className="text-xl">☀️</span>
                  ) : (
                    <span className="text-xl">🌙</span>
                  )}
                </button>

                {user ? (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(v => !v)}
                      className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-full border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      aria-haspopup="true"
                      aria-expanded={menuOpen}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white font-bold text-sm">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                      </span>
                      <span className="hidden sm:inline text-sm font-semibold text-gray-800 dark:text-slate-100 max-w-[150px] truncate">{displayName || 'Tu cuenta'}</span>
                      <svg className="h-4 w-4 text-gray-600 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-72 whitespace-nowrap rounded-xl bg-white dark:bg-slate-800 drop-shadow-2xl ring-1 ring-black/5 border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                        <div className="py-1 divide-y divide-gray-100 dark:divide-slate-700">
                          <div className="py-1">
                            <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline">Tu cuenta</Link>
                            <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline">Crear un grupo</Link>
                            <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline" title="Próximamente">Calculadoras</a>
                          </div>
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {!hideAuthLinks && (
                      <div className="flex gap-2">
                        <Link href="/auth/login" className="text-gray-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                          Login
                        </Link>
                        <Link href="/auth/register" className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md">
                          Register
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className={`${fluid ? '' : 'max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8'} pt-20`}>
        {children}
      </main>

      {user && <BottomNav />}
      </div>
    </div>
    </>
  )
}