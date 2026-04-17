// Importamos hooks de React necesarios para el componente
// useEffect: ejecutar código después del render (fetch, suscripciones, etc.)
// useRef: mantener referencia a un elemento DOM (para detectar clics fuera del menú)
// useState: manejar estado local del componente
import { useEffect, useRef, useState } from 'react'
// Cliente de Supabase para interactuar con backend (auth, queries)
import { supabase } from '../lib/supabaseClient'
// useRouter: acceder al router de Next.js para navegación programática (ej: redirigir después de logout)
import { useRouter } from 'next/router'
// Link: componente de Next.js para navegación del lado del cliente (no recarga página completa)
import Link from 'next/link'
// Hook personalizado para manejar el tema (oscuro/claro)
import { useTheme } from '../hooks/useTheme'

// Componente Layout: envuelve todas las páginas y provee navbar + estructura común
// Props:
//   - children: contenido de la página que se renderiza dentro del layout
//   - hideAuthLinks (opcional): si es true, oculta los botones Login/Register cuando no hay sesión
//   - serverUser (opcional): usuario pre-cargado desde el servidor (SSR)
export default function Layout({ 
  children, 
  hideAuthLinks, 
  serverUser 
}: { 
  children: React.ReactNode, 
  hideAuthLinks?: boolean,
  serverUser?: { id: string; email: string | null } | null
}) {
  // Estado: almacena el objeto usuario de Supabase (inicializado con el del servidor si existe)
  const [user, setUser] = useState<any>(serverUser || null)
  // Router para navegación programática (ej: router.push('/'))
  const router = useRouter()
  // Estado de carga: si tenemos serverUser, ya no estamos cargando sesión
  const [loading, setLoading] = useState(!serverUser)
  // Nombre a mostrar en el menú (cargado desde tabla profiles)
  const [displayName, setDisplayName] = useState<string>('')
  // Estado del dropdown: true = menú abierto, false = cerrado
  const [menuOpen, setMenuOpen] = useState<boolean>(false)
  // Ref al contenedor del menú para detectar clics fuera de él y cerrarlo
  const menuRef = useRef<HTMLDivElement | null>(null)
  // Estado para mostrar/ocultar navbar al hacer scroll
  const [showNavbar, setShowNavbar] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  // Hook de tema: permite cambiar entre light/dark
  const { theme, toggleTheme, mounted } = useTheme()

  // useEffect que se ejecuta una sola vez al montar el componente ([] como dependencia)
  // Responsable de verificar si hay sesión activa y escuchar cambios de autenticación
  useEffect(() => {
    // Obtener la sesión actual (si existe) desde Supabase
    // Esto lee el token guardado en localStorage y valida si es válido
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Si hay sesión, guardamos el usuario; si no, null
      // ?? null: operador de coalescencia nula, devuelve null si session?.user es undefined
      setUser(session?.user ?? null)
      // Terminamos la carga (ya sabemos si hay usuario o no)
      setLoading(false)
    })

    // Suscribirse a cambios de autenticación (login, logout, token refresh)
    // Esto permite que el componente reaccione automáticamente cuando el usuario inicia/cierra sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Actualizar el estado del usuario cada vez que cambia la sesión
      setUser(session?.user ?? null)
    })

    // Cleanup: cuando el componente se desmonta, cancelamos la suscripción para evitar memory leaks
    return () => subscription.unsubscribe()
  }, []) // [] = ejecutar solo una vez al montar

  // useEffect que carga el nombre de usuario desde la tabla profiles
  // Se ejecuta cada vez que cambia el estado 'user' ([user] como dependencia)
  useEffect(() => {
    // Función async para hacer el fetch a Supabase
    async function fetchDisplayName() {
      try {
        // Si no hay usuario logueado, limpiar el nombre y salir
        if (!user) { setDisplayName(''); return }
        // Query a Supabase: seleccionar full_name de la tabla profiles donde id = user.id
        // .single() indica que esperamos un solo resultado (no un array)
        const { data, error } = await supabase
          .from('profiles') // Tabla profiles
          .select('full_name') // Solo queremos el campo full_name
          .eq('id', user.id) // WHERE id = user.id
          .single() // Devolver un objeto, no un array
        // Si no hubo error y encontramos el full_name, lo usamos
        if (!error && data?.full_name) setDisplayName(data.full_name)
        // Si no hay full_name en profiles, usar el email como fallback
        else setDisplayName(user.email || 'Mi cuenta')
      } catch {
        // Si hay cualquier error (red, permisos, etc.), usar email como fallback
        setDisplayName(user?.email || 'Mi cuenta')
      }
    }
    // Llamar la función para ejecutar el fetch
    fetchDisplayName()
  }, [user]) // Dependencia: volver a ejecutar cuando cambie 'user'

  // useEffect para cerrar el menú dropdown cuando el usuario hace clic fuera de él
  // Patrón común para "click away" / "click outside"
  useEffect(() => {
    // Función que se llama en cada mousedown del documento
    function handleClickOutside(e: MouseEvent) {
      // Verificar si el menú está renderizado (menuRef.current existe)
      // Y si el clic NO fue dentro del menú (.contains() devuelve false)
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Si el clic fue fuera, cerrar el menú
        setMenuOpen(false)
      }
    }
    // Agregar el listener al documento (escucha todos los clics)
    document.addEventListener('mousedown', handleClickOutside)
    // Cleanup: remover el listener cuando el componente se desmonta
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, []) // [] = ejecutar solo una vez al montar

  // useEffect para mostrar/ocultar navbar según dirección del scroll
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY
      
      // Si scrolleamos hacia arriba, mostrar navbar
      if (currentScrollY < lastScrollY) {
        setShowNavbar(true)
      }
      // Si scrolleamos hacia abajo y pasamos de 10px, ocultar navbar
      else if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setShowNavbar(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlNavbar)
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY])

  // Función para cerrar sesión
  const handleSignOut = async () => {
    // Llamar a Supabase para borrar la sesión (limpia localStorage y cookies)
    await supabase.auth.signOut()
    // Redirigir al usuario a la landing page después de cerrar sesión
    router.push('/')
  }

  // Mientras loading es true, no renderizamos el layout completo
  // Esto evita mostrar el navbar sin saber si hay usuario o no (previene flash de UI incorrecta)
  if (loading || !mounted) {
    // Devolver un spinner centrado mientras cargamos la sesión
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      {/* Spinner animado con Tailwind (animate-spin + rounded-full + border) */}
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  }

  return (
    <>
    {/* Contenedor raíz: ocupa toda la pantalla y pinta el fondo en gradiente. */}
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Marco de la app: agrega borde y separación de los costados (mx) y arriba/abajo (my).
          rounded-2xl redondea esquinas y overflow-hidden recorta el contenido (navbar incluido). */}
      <div className="min-h-screen border-blue-100 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Navbar: barra superior dentro del marco. Se le quita shadow porque el marco ya tiene. 
          Transición suave para el efecto de show/hide al hacer scroll. */}
      <nav className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-none border-b border-blue-100 dark:border-slate-800 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showNavbar ? 'translate-y-0' : '-translate-y-full'
      }`}>
        {/* Contenedor centrado del navbar: limita el ancho y da padding horizontal. */}
        <div className="max-w-7xl mx-auto ">
          {/* Fila del navbar: izquierda (branding) y derecha (links/menú usuario). */}
          <div className="flex">
            {/* Branding/Logo; permanece a la izquierda. */}
            <div className="flex items-center">
              <Link href={user ? "/dashboard" : "/"} className="flex items-center px-2 text-blue-700 dark:text-blue-400 font-bold text-xl">
                💸 Dividi2
              </Link>
            </div>
            {/* Bloque derecho del navbar: links principales y menú de usuario.
                Empujado a la derecha con ml-auto; mr-6/sm:mr-10 deja un colchón respecto al borde.
                Si hideAuthLinks está activo y no hay usuario, no se muestran los enlaces de Login/Register. */}
            {(user || !hideAuthLinks) && (
              <div className="flex items-center ml-auto gap-3">
                {/* Botón de cambio de tema (Sol/Luna) */}
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
                  <>
                    {/* Menú de usuario estilo Splitwise */}
                    {/* Contenedor relativo para posicionar el dropdown absoluto. */}
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-full border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white font-bold">
                          {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-slate-100 max-w-[220px] truncate">{displayName || 'Tu cuenta'}</span>
                        <svg className="h-4 w-4 text-gray-600 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {/* Dropdown del usuario: menú flotante alineado a la derecha del botón. */}
                      {menuOpen && (
                        <div className="absolute right-0 mt-2 w-72 whitespace-nowrap rounded-xl bg-white dark:bg-slate-800 drop-shadow-2xl ring-1 ring-black/5 border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                          <div className="py-1 divide-y divide-gray-100 dark:divide-slate-700">
                            <div className="py-1">
                              <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline">Tu cuenta</Link>
                              <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline">Crear un grupo</Link>
                              <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline" title="Próximamente">Calculadoras de divisiones justas</a>
                              <a href="mailto:soporte@example.com" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 no-underline">Contactar con asistencia técnica</a>
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
                  </>
                ) : (
                  <>
                    {!hideAuthLinks && (
                      <>
                        <Link href="/auth/login" className="text-gray-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                          Login
                        </Link>
                        <Link href="/auth/register" className="ml-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-600 transition-all shadow-md">
                          Register
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Contenido principal de cada página. Se mantiene centrado y con padding. 
          pt-16 añade padding-top para compensar el navbar fixed y evitar que el contenido quede debajo. */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-16">
        {children}
      </main>
      </div>
    </div>
    </>
  )
}