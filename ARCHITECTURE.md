# Guía de Arquitectura - Splitwise Clone

## 📋 Descripción General

Esta es una aplicación web tipo Splitwise para dividir gastos entre grupos de personas. Construida con:
- **Frontend**: Next.js 13.5 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: Local (XAMPP) / Vercel (frontend) + Supabase Cloud (backend)

---

## 🏗️ Estructura del Proyecto

```
splitwise-nico/
├── frontend/                    # Aplicación Next.js
│   ├── components/             # Componentes reutilizables
│   │   └── Layout.tsx         # Navbar y estructura global
│   ├── lib/                   # Utilidades y configuración
│   │   └── supabaseClient.ts # Cliente de Supabase configurado
│   ├── pages/                 # Rutas de la app (Next.js routing)
│   │   ├── _app.tsx          # Punto de entrada global
│   │   ├── index.tsx         # Landing page (/)
│   │   ├── dashboard.tsx     # Dashboard principal
│   │   ├── profile.tsx       # Perfil de usuario
│   │   ├── auth/             # Páginas de autenticación
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   └── update-password.tsx
│   │   └── groups/
│   │       └── [id].tsx      # Detalle de grupo (ruta dinámica)
│   ├── public/               # Archivos estáticos
│   ├── styles/
│   │   └── globals.css       # Estilos globales + Tailwind
│   ├── next.config.js        # Config de Next.js
│   ├── postcss.config.js     # Config de PostCSS/Tailwind
│   ├── tailwind.config.js    # Config de Tailwind
│   └── package.json          # Dependencias
│
└── supabase/                  # Scripts SQL del backend
    ├── schema_only.sql        # Schema completo (tablas, funciones, RLS)
    ├── seed_dev.sql          # Datos de prueba
    └── init_schema_with_seed.sql # Schema + seed combinado
```

---

## 🔐 Autenticación y Sesiones

### Flujo de Autenticación

1. **Registro** (`/auth/register`):
   - Usuario ingresa email + contraseña
   - `supabase.auth.signUp()` crea cuenta
   - Supabase envía email de confirmación
   - Trigger `on_auth_user_created` crea perfil en tabla `profiles`

2. **Login** (`/auth/login`):
   - Usuario ingresa credenciales
   - `supabase.auth.signInWithPassword()` valida
   - Sesión se guarda en localStorage (automático por Supabase)
   - Redirección a `/dashboard`

3. **Sesión Persistente**:
   - `Layout.tsx` verifica sesión en cada carga: `supabase.auth.getSession()`
   - Hook `onAuthStateChange` escucha cambios (login/logout)
   - Sin sesión: muestra links "Login/Register" en navbar
   - Con sesión: muestra menú de usuario con avatar y opciones

4. **Logout**:
   - `supabase.auth.signOut()` cierra sesión
   - Redirección a landing page (`/`)

### Protección de Rutas

- **Sin redirección automática**: `dashboard.tsx` y `groups/[id].tsx` muestran UI vacía si no hay sesión, con alert.
- **Con redirección**: `profile.tsx` redirige a `/auth/login` si no hay usuario.

---

## 🗄️ Base de Datos (Supabase/PostgreSQL)

### Tablas Principales

#### `profiles`
- Almacena info adicional de usuarios (full_name)
- `id` (PK) es el mismo UUID que `auth.users.id`
- Trigger `on_auth_user_created` la crea automáticamente al registrarse

#### `groups`
- Representa grupos de gastos (ej: "Viaje a Bariloche")
- Campos: `id`, `name`, `description`, `created_by`, `created_at`
- `created_by` referencia a `profiles.id`

#### `group_members`
- Relaciona usuarios con grupos (Many-to-Many)
- Campos: `group_id`, `user_id`, `role` ('admin' o 'member')
- Trigger `auto_add_creator_to_group` agrega al creador como admin

#### `expenses`
- Representa gastos compartidos
- Campos: `id`, `group_id`, `description`, `amount`, `paid_by`, `created_at`
- `paid_by` es quien pagó el gasto

#### `expense_splits`
- Detalla cómo se divide cada gasto entre miembros
- Campos: `expense_id`, `user_id`, `amount`
- Ejemplo: gasto de $100 → 2 splits de $50 c/u

#### `settlements`
- Registro de pagos entre miembros para saldar deudas
- Campos: `id`, `group_id`, `from_user_id`, `to_user_id`, `amount`, `created_at`

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Políticas clave:

- **profiles**: usuarios pueden ver/actualizar solo su propio perfil
- **groups**: usuarios ven solo grupos donde son miembros
- **group_members**: SELECT público; INSERT/UPDATE solo para admins del grupo
- **expenses** y **expense_splits**: solo miembros del grupo pueden operar
- **settlements**: solo miembros del grupo

### Funciones SQL Importantes

- `is_group_member(group_uuid, user_uuid)`: verifica membresía
- `is_group_admin(group_uuid, user_uuid)`: verifica si es admin
- `get_user_balance_in_group(group_uuid, user_uuid)`: calcula balance neto

---

## 📊 Flujo de Datos

### Carga del Dashboard (`pages/dashboard.tsx`)

1. **Obtener usuario**: `supabase.auth.getUser()` → si no hay, alert y return
2. **Fetch grupos**: `supabase.from('groups').select('*')` → lista de grupos
3. **Calcular resumen global**:
   - Por cada grupo, obtener expenses, splits, settlements
   - Calcular balance neto del usuario: 
     - `+ gastos pagados por mí`
     - `- splits asignados a mí`
     - `+ settlements que me pagaron`
     - `- settlements que yo pagué`
   - Separar en "te deben" (positivo) y "debés" (negativo)
4. **Renderizar**:
   - Tarjetas de resumen (Te deben / Debés / Neto)
   - Lista de últimos gastos
   - Formulario para crear grupo
   - Grid de grupos existentes

### Detalle de Grupo (`pages/groups/[id].tsx`)

1. **Obtener ID del grupo**: `router.query.id`
2. **Fetch datos del grupo**:
   - Info del grupo (`groups`)
   - Miembros (`group_members` con `profiles` join)
   - Gastos (`expenses` con splits)
   - Settlements
3. **Calcular balances por miembro**:
   - Por cada miembro, sumar/restar según expenses/splits/settlements
   - Identificar quién debe a quién
4. **Renderizar**:
   - Header con nombre del grupo y botón "Agregar miembro"
   - Sección de miembros con balances coloreados (verde/rojo/gris)
   - Formulario de settlement (pagar deuda)
   - Formulario de nuevo gasto con división automática
   - Lista de gastos con detalles expandibles

### Flujo de Creación de Gasto

1. Usuario completa formulario (descripción, monto, pagador)
2. `supabase.from('expenses').insert()` crea el gasto
3. Trigger `create_equal_splits` divide automáticamente el monto entre todos los miembros
4. UI refresca para mostrar el nuevo gasto y balances actualizados

---

## 🎨 UI y Estilos

### Tailwind CSS v4

- **Import único**: `@import "tailwindcss";` en `globals.css` (no usar `@tailwind` directives)
- **PostCSS**: plugin `@tailwindcss/postcss` en `postcss.config.js`
- **Paleta**: azules/índigos para tema principal, verde para "te deben", rojo para "debés"

### Componentes de UI

- **Layout.tsx**: navbar responsivo con:
  - Logo dinámico (→ `/` sin sesión, → `/dashboard` con sesión)
  - Menú de usuario dropdown estilo Splitwise (avatar + nombre + opciones)
  - Links Login/Register (ocultos con prop `hideAuthLinks` en páginas de auth)
  - Contenedor con borde y márgenes para separar de los bordes

- **Páginas de Auth**: formularios centrados con gradientes, sin navbar clutter

- **Dashboard**: cards con gradientes, grid responsivo de grupos, hover effects

- **Grupos**: diseño denso con tabs/secciones, balances con estados coloreados, expense cards expandibles

### Responsive Design

- Mobile-first: clases base + breakpoints `sm:`, `md:`, `lg:`, `xl:`
- Grid adaptativos: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Navbar: collapsa texto en móviles, mantiene iconos

---

## 🔄 Patrones y Convenciones

### Estado Local vs. Fetching

- **Estado local**: `useState` para formularios, toggles, loading states
- **No hay caché global**: cada página hace `fetch` directo a Supabase en `useEffect`
- **Refetch manual**: después de crear/editar, se llama de nuevo a `fetchGroups()` o similar

### Manejo de Errores

- Try-catch en operaciones async
- Errores de Supabase: se extraen `error.message` o `error.details`, se muestran en `alert()` o en banner de error
- RLS violations: se capturan y muestran mensaje user-friendly

### TypeScript

- Interfaces para tipos de datos: `Group`, `Expense`, `ExpenseSplit`, `Settlement`, etc.
- Props tipados en componentes: `{ children, hideAuthLinks?: boolean }`
- `any` usado temporalmente en algunos `useState` (mejorable con tipos específicos)

### Estructura de Componentes

- **Pages**: lógica de fetch + render completo
- **Layout**: wrapper global que se reutiliza en todas las páginas (excepto landing page en algunos casos)
- **No hay carpeta `/components` grande**: por ahora solo `Layout.tsx`; espacio para extraer más componentes reutilizables (ej: `ExpenseCard`, `BalanceChip`, etc.)

---

## 🚀 Flujo de Desarrollo

### Setup Local

1. Clonar repo
2. `cd frontend && npm install`
3. Crear `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```
4. `npm run dev` → localhost:3000

### Desplegar Schema en Supabase

1. Abrir proyecto en Supabase Dashboard
2. SQL Editor → New Query
3. Pegar contenido de `supabase/schema_only.sql`
4. Run
5. (Opcional) Correr `seed_dev.sql` para datos de prueba

### Agregar Nueva Feature

1. **Backend**: agregar tablas/funciones/policies en SQL, aplicar en Supabase
2. **Frontend**: crear/editar página en `/pages`, usar `supabase.from()` para queries
3. **UI**: aplicar Tailwind classes, mantener consistencia con el diseño existente
4. **Testear**: verificar RLS, probar con múltiples usuarios, revisar errores en console

---

## 🐛 Debugging Tips

### Supabase Queries No Devuelven Datos

- Verificar RLS: ¿el usuario tiene permisos?
- Revisar `auth.uid()` en políticas: ¿se está llamando correctamente?
- Mirar logs en Supabase Dashboard → Logs

### Tailwind No Se Aplica

- Verificar `@import "tailwindcss";` en `globals.css` (v4)
- Reiniciar dev server después de cambiar config
- Revisar `postcss.config.js`: debe usar `'@tailwindcss/postcss'`

### Sesión No Persiste

- Verificar que `supabase.auth.getSession()` se llama en Layout
- Revisar localStorage del navegador: debe haber `supabase.auth.token`

### RLS Violations al Crear Grupos

- Asegurar que `auth.uid()` devuelve el usuario correcto
- Verificar trigger `auto_add_creator_to_group` se ejecuta
- Policies deben permitir `INSERT` si eres miembro del grupo (o admin)

---

## 📈 Próximas Mejoras Sugeridas

1. **Autenticación Social**: Google OAuth, GitHub (ya explicado en guía anterior)
2. **Notificaciones**: emails cuando te agregan a un grupo o registran un gasto
3. **Historial de cambios**: auditoría de quién editó/borró gastos
4. **Monedas múltiples**: soporte para USD, EUR, ARS con conversión
5. **Reportes**: gráficos de gastos por categoría/tiempo
6. **PWA**: app instalable con Service Workers
7. **Optimistic UI**: actualizar UI antes de confirmar query (mejor UX)
8. **Caché con React Query**: evitar fetches redundantes
9. **Componentes reutilizables**: extraer `<ExpenseCard>`, `<MemberBadge>`, etc.
10. **Tests**: unit tests (Jest) + E2E (Playwright/Cypress)

---

## 📚 Recursos y Documentación

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

**Última actualización**: Noviembre 2025  
**Autor**: Proyecto Splitwise Clone
