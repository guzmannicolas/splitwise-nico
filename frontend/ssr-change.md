# 🔄 Plan de Migración: CSR → Híbrido SSR/CSR

## 📋 Diagnóstico del Estado Actual

### Lo que hay hoy: **CSR puro (Client-Side Rendering)**

> **Aclaración importante**: Aunque se usa Next.js (un framework "SSR-ready"), actualmente **ninguna página usa SSR real**. Todo el data-fetching ocurre en el cliente con `useEffect` + `useState`. Next.js solo sirve el HTML shell vacío y el JS se encarga de todo en el navegador.

#### Evidencia del patrón actual (100% CSR):

| Página | Patrón de Fetch | Protección de Ruta |
|---|---|---|
| `index.tsx` | `useEffect` → `getSession()` → redirect | CSR redirect |
| `dashboard.tsx` | `useAuthUser()` hook → `useEffect` → `fetchGroups()` | No hay guard server-side |
| `profile.tsx` | `useEffect` → `getUser()` → redirect a login | CSR redirect |
| `groups/[id].tsx` | `useEffect` → `getUser()` + `useGroup()` hook | No hay guard server-side |
| `accept-invite.tsx` | `useEffect` → `getSession()` + RPC | CSR con localStorage |
| `auth/login.tsx` | Sin fetch de datos | Solo formulario CSR |
| `auth/register.tsx` | Sin fetch de datos | Solo formulario CSR |

#### Problemas del enfoque actual:

1. **Flash de contenido vacío**: El usuario ve un spinner antes de que se carguen los datos
2. **SEO nulo**: Los crawlers ven HTML vacío (sin datos pre-renderizados)
3. **Protección de rutas frágil**: Un usuario no autenticado ve un flash del dashboard antes del redirect
4. **Cascada de requests**: Navegador carga JS → JS pide sesión → JS pide datos → recién ahí renderiza
5. **Sin pre-rendering**: Cada navegación requiere esperar todo el ciclo CSR

---

## 🎯 Objetivo: Modelo Híbrido SSR + CSR

La idea es **usar SSR donde tenga sentido** (carga inicial, protección de rutas, SEO) y **mantener CSR donde sea necesario** (interacciones en tiempo real, formularios, estados locales).

### Estrategia por página:

| Página | Estrategia Propuesta | Razón |
|---|---|---|
| `index.tsx` | **SSR** (`getServerSideProps`) | Redirect server-side si hay sesión → elimina flash |
| `dashboard.tsx` | **SSR** (`getServerSideProps`) | Pre-cargar grupos y summary → elimina spinner inicial |
| `profile.tsx` | **SSR** (`getServerSideProps`) | Pre-cargar perfil + guard de auth server-side |
| `groups/[id].tsx` | **SSR** (`getServerSideProps`) | Pre-cargar grupo, miembros, gastos → **mayor impacto en UX** |
| `accept-invite.tsx` | **CSR** (mantener) | Depende de token en URL + flujo async complejo con localStorage |
| `auth/*` | **SSR ligero** (`getServerSideProps`) | Solo verificar si ya hay sesión → redirect a dashboard |
| `Layout.tsx` | **Híbrido** | Recibir `user` como prop del SSR, mantener auth listener CSR |

---

## 📦 Paso 0: Instalar Supabase SSR Helper

Next.js 13.5 con Pages Router necesita una forma de autenticar requests server-side. El cliente actual (`createClient` simple) **solo funciona en el navegador** porque usa `localStorage`.

### Instalar dependencia:
```bash
npm install @supabase/ssr
```

### Crear cliente SSR (`lib/supabaseServer.ts`):
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type GetServerSidePropsContext } from 'next'

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
```

> **¿Por qué?** En el servidor no hay `localStorage`. Supabase SSR usa cookies HTTP para mantener la sesión entre cliente y servidor.

---

## 📦 Paso 1: Actualizar `_app.tsx` para recibir props SSR

El `_app.tsx` actual no pasa datos del servidor a las páginas. Necesita recibir y propagar las props que vengan de `getServerSideProps`.

### Cambios en `_app.tsx`:
```typescript
// _app.tsx - Ya funciona correctamente con pageProps
// Next.js automáticamente pasa las props de getServerSideProps
// a través de pageProps. No se necesitan cambios aquí, 
// pero opcionalmente podemos crear un AuthProvider:

import { createContext, useContext } from 'react'
import type { AuthUser } from '../lib/hooks/useAuthUser'

export const AuthContext = createContext<AuthUser | null>(null)

export default function App({ Component, pageProps }: AppProps) {
  // Si la página trae user desde SSR, usarlo como valor inicial del contexto
  const serverUser = pageProps.user || null

  return (
    <AuthContext.Provider value={serverUser}>
      <Head>...</Head>
      <Component {...pageProps} />
    </AuthContext.Provider>
  )
}
```

---

## 📦 Paso 2: Crear helper de auth guard reutilizable

Para no repetir la misma lógica en cada `getServerSideProps`:

### Crear `lib/authGuard.ts`:
```typescript
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import { createSupabaseServerClient } from './supabaseServer'

interface AuthGuardResult {
  user: { id: string; email: string | null }
  supabase: ReturnType<typeof createSupabaseServerClient>
}

/**
 * Guard de autenticación para getServerSideProps.
 * Redirige a /auth/login si no hay sesión.
 */
export async function requireAuth(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<any> | AuthGuardResult> {
  const supabase = createSupabaseServerClient(context)
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
 * Guard inverso: redirige a /dashboard si YA hay sesión.
 * Para usar en páginas de auth (login, register, etc.)
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

  return null // No hay sesión, proceder normal
}
```

---

## 📦 Paso 3: Migrar `index.tsx` (Landing Page)

**Objetivo**: Si hay sesión → redirect server-side a `/dashboard`. Si no → renderizar landing.

### Antes (CSR):
```typescript
// index.tsx - ANTES
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) router.push('/dashboard')
  }
  checkSession()
}, [router])
```

### Después (SSR):
```typescript
// index.tsx - DESPUÉS
import { GetServerSideProps } from 'next'
import { redirectIfAuthed } from '../lib/authGuard'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await redirectIfAuthed(context)
  if (redirect) return redirect

  return { props: {} }
}

export default function Home() {
  // Ya no necesita useEffect para checkSession
  // Si llega aquí, sabemos que NO hay sesión
  return (
    <Layout>
      <main>...</main>
    </Layout>
  )
}
```

**✅ Beneficio**: Elimina el flash de la landing page para usuarios logueados.

---

## 📦 Paso 4: Migrar `dashboard.tsx`

**Objetivo**: Pre-cargar grupos y summary en el servidor. Mantener interacciones CSR (crear grupo, cambiar vista).

### Después (SSR + CSR):
```typescript
import { GetServerSideProps } from 'next'
import { requireAuth } from '../lib/authGuard'

interface DashboardProps {
  user: { id: string; email: string | null }
  initialGroups: Group[]
  initialSummary: GlobalSummary | null
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await requireAuth(context)
  if ('redirect' in result) return result // No autenticado

  const { user, supabase } = result

  // Pre-fetch de grupos
  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })

  // Pre-fetch de summary (usando SummaryService server-side o query directa)
  // NOTA: los servicios actuales usan el cliente browser, 
  // hay que pasar el supabase server client o duplicar la query
  const summary = null // TODO: implementar SummaryService con supabase param

  return {
    props: {
      user,
      initialGroups: groups || [],
      initialSummary: summary,
    },
  }
}

export default function Dashboard({ user, initialGroups, initialSummary }: DashboardProps) {
  // Hidratar con datos del servidor, pero mantener refresh CSR
  const [groups, setGroups] = useState<Group[]>(initialGroups)

  // Los hooks CSR siguen funcionando para actualizaciones dinámicas
  // pero ahora empiezan con datos pre-cargados → no hay spinner
}
```

**✅ Beneficio**: El dashboard aparece con datos desde el primer render. Crear grupo, cambiar vista, etc. siguen siendo CSR.

---

## 📦 Paso 5: Migrar `groups/[id].tsx`

**Objetivo**: Pre-cargar toda la info del grupo. Mayor impacto en UX.

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await requireAuth(context)
  if ('redirect' in result) return result

  const { user, supabase } = result
  const groupId = context.params?.id as string

  // Pre-fetch en paralelo
  const [groupRes, membersRes, expensesRes, settlementsRes] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    supabase.from('group_members').select('user_id, profiles(full_name, email)').eq('group_id', groupId),
    supabase.from('expenses').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
    supabase.from('settlements').select('*').eq('group_id', groupId),
  ])

  if (groupRes.error) {
    return { redirect: { destination: '/dashboard', permanent: false } }
  }

  // Fetch splits
  const expenseIds = expensesRes.data?.map(e => e.id) || []
  const { data: splits } = expenseIds.length > 0
    ? await supabase.from('expense_splits').select('*').in('expense_id', expenseIds)
    : { data: [] }

  return {
    props: {
      user,
      initialGroup: groupRes.data,
      initialMembers: membersRes.data || [],
      initialExpenses: expensesRes.data || [],
      initialSplits: splits || [],
      initialSettlements: settlementsRes.data || [],
    },
  }
}
```

**✅ Beneficio**: El grupo carga completo desde el primer render. Las operaciones CRUD (crear gasto, liquidar) siguen siendo CSR con refresh.

---

## 📦 Paso 6: Migrar `profile.tsx`

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await requireAuth(context)
  if ('redirect' in result) return result

  const { user, supabase } = result

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return {
    props: {
      user,
      initialProfile: {
        email: user.email,
        fullName: profile?.full_name || '',
      },
    },
  }
}
```

**✅ Beneficio**: No más spinner ni redirect CSR. El perfil carga pre-populado.

---

## 📦 Paso 7: Migrar páginas de Auth

Solo necesitan un guard inverso (redirect si ya hay sesión):

```typescript
// pages/auth/login.tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await redirectIfAuthed(context)
  if (redirect) return redirect
  return { props: {} }
}

// Mismo patrón para register.tsx, forgot-password.tsx
```

**✅ Beneficio**: Si el usuario ya logueado intenta ir a `/auth/login`, es redirigido instantáneamente sin flash.

---

## 📦 Paso 8: Actualizar `Layout.tsx` para aceptar user SSR

El Layout actualmente hace su propio fetch de sesión con `useEffect`. Podemos optimizarlo:

```typescript
interface LayoutProps {
  children: React.ReactNode
  hideAuthLinks?: boolean
  serverUser?: { id: string; email: string | null } | null
}

export default function Layout({ children, hideAuthLinks, serverUser }: LayoutProps) {
  // Si tenemos user del SSR, usarlo como valor inicial (sin flash)
  const [user, setUser] = useState<any>(serverUser || null)
  const [loading, setLoading] = useState(!serverUser) // Si hay serverUser, no loading

  useEffect(() => {
    // Solo hacer fetch si no tenemos user del SSR
    if (!serverUser) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
    }

    // Siempre escuchar cambios (logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [serverUser])

  // ...resto del componente
}
```

---

## 📦 Paso 9: Refactorizar Services para aceptar cliente Supabase como parámetro

Los servicios actuales (`GroupService`, `SummaryService`, etc.) importan directamente el cliente browser:

```typescript
// ANTES - solo funciona en browser
import { supabase } from '../supabaseClient'

export class GroupService {
  static async getGroupById(groupId: string) {
    return supabase.from('groups').select('*').eq('id', groupId).single()
  }
}
```

Para reutilizarlos en SSR:

```typescript
// DESPUÉS - funciona en browser Y servidor
import { supabase as browserClient } from '../supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'

export class GroupService {
  static async getGroupById(groupId: string, client?: SupabaseClient) {
    const db = client || browserClient
    return db.from('groups').select('*').eq('id', groupId).single()
  }
}
```

> **Esto es opcional**. En los pasos anteriores se muestran queries directas en `getServerSideProps`, lo cual es perfectamente válido. Refactorizar los servicios es una mejora de limpieza para evitar duplicar queries.

---

## 📦 Paso 10: Mantener `accept-invite.tsx` como CSR

Esta página tiene un flujo complejo que depende de:
1. Token en query params
2. `localStorage` para guardar invitaciones pendientes
3. Flujo async con RPC

**Recomendación**: Mantenerla 100% CSR. Opcionalmente, agregar un SSR mínimo para verificar que el token existe:

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = context.query.token as string | undefined

  if (!token) {
    return { redirect: { destination: '/dashboard', permanent: false } }
  }

  return { props: { token } }
}
```

---

## 📋 Resumen de Archivos a Crear/Modificar

### Archivos Nuevos:
| Archivo | Descripción |
|---|---|
| `lib/supabaseServer.ts` | Cliente Supabase para SSR (usa cookies HTTP) |
| `lib/authGuard.ts` | Helpers `requireAuth` y `redirectIfAuthed` |

### Archivos a Modificar:
| Archivo | Cambio Principal |
|---|---|
| `pages/index.tsx` | Agregar `getServerSideProps` + eliminar `useEffect` de redirect |
| `pages/dashboard.tsx` | Agregar `getServerSideProps` + recibir props iniciales |
| `pages/profile.tsx` | Agregar `getServerSideProps` + eliminar `useEffect` de auth |
| `pages/groups/[id].tsx` | Agregar `getServerSideProps` + pre-fetch paralelo |
| `pages/auth/login.tsx` | Agregar `getServerSideProps` con `redirectIfAuthed` |
| `pages/auth/register.tsx` | Agregar `getServerSideProps` con `redirectIfAuthed` |
| `pages/auth/forgot-password.tsx` | Agregar `getServerSideProps` con `redirectIfAuthed` |
| `pages/auth/update-password.tsx` | Evaluar (puede requerir token en URL) |
| `pages/accept-invite.tsx` | Opcional: SSR mínimo para validar token |
| `components/Layout.tsx` | Aceptar `serverUser` prop opcional |
| `pages/_app.tsx` | Opcional: crear `AuthContext` con user SSR |
| `lib/services/*.ts` | Opcional: aceptar Supabase client como param |

### Dependencia Nueva:
```bash
npm install @supabase/ssr
```

---

## ⚠️ Consideraciones Importantes

### 1. Cookies vs localStorage
- **Hoy**: La sesión de Supabase se guarda en `localStorage` (solo browser)
- **Después**: Necesitamos que también se propague por cookies para que el servidor pueda leerla
- `@supabase/ssr` maneja esto automáticamente, pero hay que asegurarse de que el **cliente browser también use cookies** para que la sesión sea visible en ambos lados

### 2. Actualizar el cliente browser
El `supabaseClient.ts` actual usa `createClient` simple. Para que la sesión se comparta con el servidor via cookies, podrÍa requerir actualizar a:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### 3. Middleware opcional (optimización futura)
Next.js tiene `middleware.ts` que se ejecuta **antes** de cada request. Se puede usar para:
- Refrescar tokens automáticamente
- Proteger rutas sin `getServerSideProps`
- Redirect centralizado

```typescript
// middleware.ts (en raíz del frontend)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Leer cookie de sesión
  // Si no hay sesión y la ruta requiere auth → redirect
  // Si hay sesión y la ruta es auth → redirect a dashboard
}

export const config = {
  matcher: ['/dashboard', '/profile', '/groups/:path*', '/auth/:path*']
}
```

> Esto es una **optimización futura**, no necesaria para la migración inicial.

### 4. Rendimiento SSR
- `getServerSideProps` se ejecuta en **cada request** (no hay caché por defecto)
- Para datos que cambian poco, considerar `revalidate` con ISR o SWR en el cliente
- Las queries paralelas (`Promise.all`) en `groups/[id].tsx` minimizan la latencia

### 5. Deploy en Vercel
- Vercel soporta SSR nativamente con Next.js
- Las funciones serverless se crean automáticamente por cada `getServerSideProps`
- No hay cambio en el deploy workflow

---

## 📌 Orden de Ejecución Recomendado

1. ✅ Instalar `@supabase/ssr`
2. ✅ Crear `lib/supabaseServer.ts`
3. ✅ Crear `lib/authGuard.ts`
4. ✅ Actualizar `lib/supabaseClient.ts` (browser client con cookies)
5. ✅ Migrar `index.tsx` (la más simple, para validar el setup)
6. ✅ Migrar `auth/login.tsx` y `auth/register.tsx`
7. ✅ Migrar `profile.tsx`
8. ✅ Migrar `dashboard.tsx`
9. ✅ Migrar `groups/[id].tsx` (la más compleja)
10. ✅ Actualizar `Layout.tsx`
11. 🔄 (Opcional) Refactorizar Services
12. 🔄 (Opcional) Agregar `middleware.ts`

---

## 🧪 Testing de la Migración

Para cada página migrada, verificar:

- [ ] **Sin sesión**: Se redirige correctamente a login (server-side, sin flash)
- [ ] **Con sesión**: Los datos se pre-cargan y la página renderiza sin spinner
- [ ] **Refresh de página**: La sesión persiste (cookies funcionan)
- [ ] **Logout → Login**: La sesión se crea correctamente y las cookies se setean
- [ ] **Operaciones CSR**: Crear grupo, crear gasto, liquidar, etc. siguen funcionando
- [ ] **Auth listener**: Si se cierra sesión en otra tab, el state se actualiza
- [ ] **Network tab**: Verificar que `getServerSideProps` hace las queries (no el browser)

---

*Documento creado: Abril 2025*  
*Proyecto: Dividi2 (Splitwise-Nico)*
