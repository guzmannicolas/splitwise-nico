# Documentación Línea por Línea - Dashboard.tsx

## Descripción General
`pages/dashboard.tsx` es la página principal de la aplicación. Muestra:
- Resumen global de balances (te deben / debés / neto)
- Lista de últimos gastos
- Formulario para crear nuevos grupos
- Grid de grupos existentes con acceso a detalle

---

## Imports y Tipos

```tsx
import { useEffect, useState } from 'react'
```
**Explicación**: Importa hooks de React necesarios
- `useEffect`: para ejecutar lógica después del render (fetch de datos)
- `useState`: para manejar estado local del componente

```tsx
import { supabase } from '../lib/supabaseClient'
```
**Explicación**: Cliente de Supabase para hacer queries a la base de datos y obtener info de autenticación

```tsx
import Layout from '../components/Layout'
```
**Explicación**: Componente Layout que envuelve la página (navbar + estructura)

```tsx
interface Group {
  id: string
  name: string
  description: string
  created_at: string
}
```
**Explicación**: Define el tipo TypeScript para un grupo. Representa la estructura de la tabla `groups` en Supabase.
- `id`: UUID único del grupo
- `name`: nombre descriptivo (ej: "Viaje a Bariloche")
- `description`: descripción opcional
- `created_at`: timestamp de creación

```tsx
interface Expense {
  id: string
  description: string
  amount: number
  paid_by: string
  group_id: string
  created_at: string
  profiles?: { full_name: string }
}
```
**Explicación**: Define el tipo para un gasto
- `id`: UUID único del gasto
- `description`: qué se pagó (ej: "Cena restaurante")
- `amount`: monto en número (ej: 1020.50)
- `paid_by`: UUID del usuario que pagó
- `group_id`: UUID del grupo al que pertenece
- `created_at`: timestamp
- `profiles?`: objeto opcional con el nombre del pagador (viene del join con tabla profiles)

```tsx
interface ExpenseSplit {
  expense_id: string
  user_id: string
  amount: number
}
```
**Explicación**: Define cómo se divide un gasto entre miembros
- `expense_id`: a qué gasto pertenece
- `user_id`: quién debe esta parte
- `amount`: cuánto debe esta persona

```tsx
interface Settlement {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  created_at: string
}
```
**Explicación**: Representa un pago para saldar deudas
- `from_user_id`: quién pagó
- `to_user_id`: quién recibió el pago
- `amount`: cuánto se pagó

---

## Estado del Componente

```tsx
export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([])
```
**Explicación**: Estado que almacena la lista de grupos del usuario. Inicialmente un array vacío.

```tsx
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
```
**Explicación**: Estados para los inputs del formulario de creación de grupo.

```tsx
  const [loading, setLoading] = useState(true)
```
**Explicación**: Flag de carga. Mientras es `true`, se muestra un spinner.

```tsx
  const [currentUserId, setCurrentUserId] = useState<string>('')
```
**Explicación**: Almacena el UUID del usuario logueado.

```tsx
  const [totalOwedToYou, setTotalOwedToYou] = useState(0) // te deben
  const [totalYouOwe, setTotalYouOwe] = useState(0) // debés
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
```
**Explicación**: Estados para el resumen global:
- `totalOwedToYou`: cuánto dinero te deben en total
- `totalYouOwe`: cuánto dinero debés
- `recentExpenses`: lista de gastos recientes para mostrar en la sección "Últimos gastos"

---

## useEffect - Cargar Datos Iniciales

```tsx
  useEffect(() => {
    fetchGroups()
  }, [])
```
**Explicación**: useEffect que se ejecuta una vez al montar el componente (dependencias vacías `[]`).
Llama a `fetchGroups()` para cargar la lista de grupos del usuario.

---

## Función fetchGroups

```tsx
  async function fetchGroups() {
    try {
      console.log('=== Iniciando fetchGroups ===')
```
**Explicación**: Función async que obtiene los grupos del usuario desde Supabase. Los logs ayudan a debuggear.

```tsx
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Usuario actual:', user)
```
**Explicación**: Obtiene el usuario autenticado actual. Si no hay sesión, `user` será `null`.

```tsx
      if (!user) {
        console.error('No hay usuario autenticado')
        alert('No hay usuario autenticado. Por favor, inicia sesión.')
        setLoading(false)
        return
      }
```
**Explicación**: Si no hay usuario, muestra un alert y detiene la ejecución. Marca loading como false para que el spinner desaparezca.

```tsx
      setCurrentUserId(user.id)
```
**Explicación**: Guarda el UUID del usuario en el estado para usarlo después.

```tsx
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
```
**Explicación**: Query a Supabase:
- `.from('groups')`: tabla a consultar
- `.select('*')`: traer todas las columnas
- `.order('created_at', { ascending: false })`: ordenar por fecha de creación, más recientes primero
- RLS (Row Level Security) automáticamente filtra para que solo veas grupos donde eres miembro

```tsx
      console.log('Respuesta de Supabase:', { data, error })
      
      if (error) {
        console.error('Error completo:', JSON.stringify(error, null, 2))
        alert(`Error al obtener grupos: ${error.message || JSON.stringify(error)}`)
```
**Explicación**: Si hubo un error en la query, lo loggeamos y mostramos un alert con el mensaje.

```tsx
      } else {
        console.log('Grupos obtenidos exitosamente:', data)
        setGroups(data || [])
```
**Explicación**: Si no hubo error, guardamos los grupos en el estado. `data || []` asegura que nunca sea null.

```tsx
        await fetchGlobalSummary(user.id, data || [])
```
**Explicación**: Después de cargar los grupos, calculamos el resumen global de balances.

```tsx
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      alert('Error al obtener grupos: ' + (error instanceof Error ? error.message : String(error)))
```
**Explicación**: Catch para errores inesperados (network, etc.). Muestra alert con el mensaje.

```tsx
    } finally {
      setLoading(false)
    }
  }
```
**Explicación**: `finally` se ejecuta siempre (haya error o no). Marca loading como false para ocultar el spinner.

---

## Función fetchGlobalSummary

```tsx
  async function fetchGlobalSummary(userId: string, groupsList: Group[]) {
    try {
      const groupIds = groupsList.map(g => g.id)
```
**Explicación**: Extrae los IDs de todos los grupos en un array para usarlos en queries.

```tsx
      if (groupIds.length === 0) {
        setTotalOwedToYou(0)
        setTotalYouOwe(0)
        setRecentExpenses([])
        return
      }
```
**Explicación**: Si no hay grupos, pone todos los totales en 0 y sale.

```tsx
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`id, description, amount, paid_by, group_id, created_at, profiles:paid_by ( full_name )`)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(50)
```
**Explicación**: Query de gastos:
- `.select(...)`: trae columnas de expenses + hace un JOIN con profiles para obtener el nombre del pagador
- `.in('group_id', groupIds)`: WHERE group_id IN (groupIds) - solo gastos de estos grupos
- `.order(...)`: más recientes primero
- `.limit(50)`: máximo 50 gastos (para el widget "Últimos gastos")

```tsx
      if (!expensesError && expensesData) {
        setRecentExpenses(expensesData as any)
      } else {
        setRecentExpenses([])
      }
```
**Explicación**: Guarda los gastos recientes en el estado, o array vacío si hubo error.

```tsx
      const { data: allExpenses, error: allExpError } = await supabase
        .from('expenses')
        .select('id, amount, paid_by, group_id, created_at')
        .in('group_id', groupIds)
```
**Explicación**: Obtiene TODOS los gastos de estos grupos (sin límite) para calcular balances totales.

```tsx
      const expIds = (allExpenses || []).map(e => e.id)
      let splits: ExpenseSplit[] = []
      if (expIds.length > 0) {
        const { data: splitsData, error: splitsError } = await supabase
          .from('expense_splits')
          .select('expense_id, user_id, amount')
          .in('expense_id', expIds)
        if (!splitsError && splitsData) splits = splitsData as any
      }
```
**Explicación**: Obtiene todos los splits (divisiones) de esos gastos.
- Primero saca los IDs de los gastos
- Luego hace query a expense_splits WHERE expense_id IN (expIds)
- Esto nos dice quién debe cuánto de cada gasto

```tsx
      let settlements: Settlement[] = []
      try {
        const { data: stData, error: stError } = await supabase
          .from('settlements')
          .select('id, group_id, from_user_id, to_user_id, amount, created_at')
          .in('group_id', groupIds)
        if (!stError && stData) settlements = stData as any
      } catch {}
```
**Explicación**: Obtiene todos los settlements (pagos para saldar deudas) de estos grupos.
- Try-catch extra por si la tabla settlements no existe o tiene problemas

```tsx
      let net = 0
```
**Explicación**: Variable para calcular el balance neto del usuario (positivo = te deben, negativo = debés)

```tsx
      ;(allExpenses || []).forEach(e => {
        if (e.paid_by === userId) net += e.amount
      })
```
**Explicación**: Por cada gasto pagado por este usuario, SUMA el monto al neto (porque pagaste, te deben)

```tsx
      splits.forEach(s => {
        if (s.user_id === userId) net -= s.amount
      })
```
**Explicación**: Por cada split asignado a este usuario, RESTA del neto (porque debés esa parte del gasto)

```tsx
      settlements.forEach(s => {
        if (s.from_user_id === userId) net += s.amount
        if (s.to_user_id === userId) net -= s.amount
      })
```
**Explicación**: Por cada settlement:
- Si pagaste (`from_user_id`), SUMA (porque pagaste una deuda, alguien te debe menos o ya no te debe)
- Si recibiste (`to_user_id`), RESTA (porque te pagaron, ahora debés menos)

```tsx
      setTotalOwedToYou(net > 0 ? net : 0)
      setTotalYouOwe(net < 0 ? Math.abs(net) : 0)
```
**Explicación**: Separa el balance neto en dos valores:
- Si net > 0: te deben ese monto → guarda en `totalOwedToYou`
- Si net < 0: debés ese monto (en positivo) → guarda en `totalYouOwe`

```tsx
    } catch (err) {
      console.error('Error calculando resumen global', err)
    }
  }
```
**Explicación**: Catch para errores inesperados al calcular el resumen.

---

## Función createGroup

```tsx
  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
```
**Explicación**: Función para crear un nuevo grupo. `e.preventDefault()` evita que el form recargue la página.

```tsx
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No hay usuario autenticado')
      }
```
**Explicación**: Verifica que haya sesión antes de crear el grupo.

```tsx
      console.log('=== DEBUG CREATE GROUP ===')
      console.log('Session user ID:', session.user.id)
      console.log('Session:', session)
```
**Explicación**: Logs de debug para verificar que la sesión esté correcta.

```tsx
      const { data: testUid, error: testError } = await supabase.rpc('test_auth_uid')
      console.log('Test auth.uid() result:', { testUid, testError })
```
**Explicación**: Llama a una función SQL de prueba para verificar que `auth.uid()` funcione en el servidor.

```tsx
      console.log('Creando grupo...', {
        name: newGroupName,
        description: newGroupDesc,
        created_by: session.user.id
      })

      const { data, error } = await supabase
        .from('groups')
        .insert([
          {
            name: newGroupName,
            description: newGroupDesc,
            created_by: session.user.id
          }
        ])
        .select()
```
**Explicación**: INSERT en la tabla groups:
- `.insert([...])`: inserta un registro con los valores del formulario
- `.select()`: devuelve el grupo recién creado (incluye el ID generado)
- El trigger `auto_add_creator_to_group` automáticamente agregará al usuario como admin del grupo

```tsx
      if (error) {
        console.error('Error detallado:', error)
        alert('Error al crear el grupo: ' + (error.message || JSON.stringify(error)))
        return
      }
```
**Explicación**: Si hubo error, mostrarlo y salir.

```tsx
      console.log('Grupo creado:', data)
      
      setNewGroupName('')
      setNewGroupDesc('')
```
**Explicación**: Limpiar los inputs del formulario después de crear el grupo.

```tsx
      fetchGroups()
```
**Explicación**: Refetch de todos los grupos para que la lista se actualice con el nuevo grupo.

```tsx
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error al crear el grupo: ' + (error instanceof Error ? error.message : JSON.stringify(error)))
    }
  }
```
**Explicación**: Catch para errores inesperados, con alert al usuario.

---

## Render del Componente

```tsx
  return (
    <Layout>
```
**Explicación**: Envuelve toda la página con el Layout (navbar + estructura)

```tsx
      <div className="space-y-6 px-2 py-4">
```
**Explicación**: Contenedor principal:
- `space-y-6`: espacio vertical entre secciones hijas
- `px-2 py-4`: padding horizontal y vertical

### Sección: Resumen Global

```tsx
        <div className="bg-gradient-to-br from-white to-blue-50 shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-6">Resumen General</h2>
```
**Explicación**: Card con gradiente y bordes redondeados para el resumen financiero.

```tsx
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
```
**Explicación**: Grid responsivo:
- En móvil (default): 1 columna
- En tablet+ (md:): 3 columnas

```tsx
            <div className="p-6 bg-white rounded-xl shadow-md border border-green-200">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Te deben</p>
              <p className="text-3xl font-extrabold text-green-600 mt-2">${totalOwedToYou.toFixed(2)}</p>
            </div>
```
**Explicación**: Tarjeta "Te deben" con monto en verde.
- `.toFixed(2)`: formatea el número a 2 decimales

```tsx
            <div className="p-6 bg-white rounded-xl shadow-md border border-red-200">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Debés</p>
              <p className="text-3xl font-extrabold text-red-600 mt-2">${totalYouOwe.toFixed(2)}</p>
            </div>
```
**Explicación**: Tarjeta "Debés" con monto en rojo.

```tsx
            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
              <p className="text-sm font-semibold uppercase tracking-wide">Neto</p>
              <p className="text-3xl font-extrabold mt-2">${(totalOwedToYou - totalYouOwe).toFixed(2)}</p>
            </div>
```
**Explicación**: Tarjeta "Neto" (te deben - debés) con gradiente azul.

### Sección: Últimos Gastos

```tsx
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Últimos gastos</h2>
          {recentExpenses.length > 0 ? (
```
**Explicación**: Card de gastos recientes. Si hay gastos, muestra lista; si no, mensaje de "No hay gastos".

```tsx
            <ul className="divide-y divide-gray-200">
              {recentExpenses.slice(0,10).map(e => (
```
**Explicación**: Lista dividida con líneas grises entre items. `.slice(0,10)` limita a 10 gastos.

```tsx
                <li key={e.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-blue-50 transition-colors px-2 rounded">
```
**Explicación**: Item de gasto:
- `key={e.id}`: requerido por React para listas
- Layout: columna en móvil, fila en desktop
- `hover:bg-blue-50`: efecto hover

```tsx
                  <div>
                    <p className="font-semibold text-gray-800">{e.description} <span className="text-gray-400 text-sm">· {new Date(e.created_at).toLocaleDateString()}</span></p>
```
**Explicación**: Descripción del gasto + fecha formateada

```tsx
                    <p className="text-sm text-gray-500 mt-1">{groups.find(g => g.id === e.group_id)?.name || 'Grupo'} — Pagado por {e.profiles?.full_name || e.paid_by.slice(0,8)}</p>
```
**Explicación**: Busca el nombre del grupo y muestra quién pagó. Si no hay full_name, muestra los primeros 8 chars del UUID.

```tsx
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-700 text-lg">${e.amount.toFixed(2)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-center py-4">No hay gastos recientes</p>
          )}
        </div>
```
**Explicación**: Cierre de la sección de gastos. Si no hay gastos, muestra mensaje centrado.

### Sección: Crear Nuevo Grupo

```tsx
        <div className="bg-gradient-to-br from-white to-indigo-50 shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Crear nuevo grupo</h2>
          <form onSubmit={createGroup} className="space-y-4">
```
**Explicación**: Card con formulario. `onSubmit={createGroup}` llama a la función cuando se envía.

```tsx
            <div>
              <input
                type="text"
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>
```
**Explicación**: Input controlado para el nombre del grupo:
- `value={newGroupName}`: valor actual del estado
- `onChange={...}`: actualiza el estado al escribir
- `required`: HTML5 validation (no se puede enviar vacío)

```tsx
            <div>
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
```
**Explicación**: Input para descripción (opcional, sin `required`)

```tsx
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold p-3 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200"
            >
              Crear Grupo
            </button>
          </form>
        </div>
```
**Explicación**: Botón de envío con gradiente y efecto hover.

### Sección: Lista de Grupos

```tsx
        <div className="bg-white shadow-xl rounded-2xl border border-blue-100">
          <div className="px-6 py-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-6">Tus grupos</h2>
            {loading ? (
```
**Explicación**: Card para mostrar los grupos. Si `loading` es true, muestra spinner.

```tsx
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
              </div>
```
**Explicación**: Spinner centrado mientras carga.

```tsx
            ) : groups.length > 0 ? (
```
**Explicación**: Si no está cargando y hay grupos, muestra grid.

```tsx
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```
**Explicación**: Grid responsivo: 1 col (móvil), 2 (tablet), 3 (desktop)

```tsx
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-5 hover:shadow-lg hover:scale-99 cursor-pointer transition-all duration-200"
                    onClick={() => window.location.href = `/groups/${group.id}`}
```
**Explicación**: Tarjeta de grupo con efecto hover. Al hacer clic, navega a la página de detalle del grupo.
- `window.location.href`: navegación directa (recarga página). Alternativa: `router.push()` para SPA navigation.

```tsx
                  >
                    <h3 className="font-bold text-lg text-blue-800">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-600 text-sm mt-2">{group.description}</p>
                    )}
                  </div>
                ))}
              </div>
```
**Explicación**: Renderiza nombre del grupo y descripción (si existe).

```tsx
            ) : (
              <p className="text-gray-400 text-center py-8">No hay grupos todavía</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
```
**Explicación**: Cierre del componente. Si no hay grupos y no está cargando, muestra mensaje "No hay grupos todavía".

---

## Resumen del Flujo

1. **Montaje**: useEffect llama a `fetchGroups()`
2. **fetchGroups**: obtiene usuario, carga grupos, llama a `fetchGlobalSummary`
3. **fetchGlobalSummary**: carga expenses, splits, settlements; calcula balance neto
4. **Render**: muestra resumen, gastos recientes, form crear grupo, grid de grupos
5. **Crear Grupo**: usuario llena form, submit llama a `createGroup`, INSERT en DB, refetch
6. **Click en Grupo**: navega a `/groups/[id]` para ver detalle

---

## Mejoras Potenciales

1. **Optimistic UI**: actualizar UI antes de confirmar query
2. **Debounce en filtros**: si se agregan búsquedas/filtros
3. **Paginación**: si hay muchos grupos/gastos
4. **Caché**: usar React Query para evitar refetch innecesarios
5. **Loading states granulares**: spinners por sección en lugar de global
6. **Error boundaries**: capturar errores de render
7. **Skeleton loaders**: en lugar de spinner, mostrar placeholders
8. **Formik/React Hook Form**: para manejo de formularios más robusto
