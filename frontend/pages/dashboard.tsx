import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

interface Group {
  id: string
  name: string
  description: string
  created_at: string
}

interface Expense {
  id: string
  description: string
  amount: number
  paid_by: string
  group_id: string
  created_at: string
  profiles?: { full_name: string }
}

interface ExpenseSplit {
  expense_id: string
  user_id: string
  amount: number
}

interface Settlement {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  created_at: string
}

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // Global summary
  const [totalOwedToYou, setTotalOwedToYou] = useState(0) // te deben
  const [totalYouOwe, setTotalYouOwe] = useState(0) // debés
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])

  useEffect(() => {
    fetchGroups()
  }, [])

  async function fetchGroups() {
    try {
      console.log('=== Iniciando fetchGroups ===')
      
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Usuario actual:', user)
      
      if (!user) {
        console.error('No hay usuario autenticado')
        alert('No hay usuario autenticado. Por favor, inicia sesión.')
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        
      console.log('Respuesta de Supabase:', { data, error })
      
      if (error) {
        console.error('Error completo:', JSON.stringify(error, null, 2))
        alert(`Error al obtener grupos: ${error.message || JSON.stringify(error)}`)
      } else {
        console.log('Grupos obtenidos exitosamente:', data)
        setGroups(data || [])
        // Después de tener grupos, cargar resumen global
        await fetchGlobalSummary(user.id, data || [])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      alert('Error al obtener grupos: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  async function fetchGlobalSummary(userId: string, groupsList: Group[]) {
    try {
      const groupIds = groupsList.map(g => g.id)
      if (groupIds.length === 0) {
        setTotalOwedToYou(0)
        setTotalYouOwe(0)
        setRecentExpenses([])
        return
      }

      // Obtener gastos recientes y datos para cálculo
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`id, description, amount, paid_by, group_id, created_at, profiles:paid_by ( full_name )`)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!expensesError && expensesData) {
        setRecentExpenses(expensesData as any)
      } else {
        setRecentExpenses([])
      }

      // Para totales necesitamos todos los gastos (o un rango); por simplicidad, usamos todos los gastos de estos grupos
      const { data: allExpenses, error: allExpError } = await supabase
        .from('expenses')
        .select('id, amount, paid_by, group_id, created_at')
        .in('group_id', groupIds)
      if (allExpError) throw allExpError

      const expIds = (allExpenses || []).map(e => e.id)
      let splits: ExpenseSplit[] = []
      if (expIds.length > 0) {
        const { data: splitsData, error: splitsError } = await supabase
          .from('expense_splits')
          .select('expense_id, user_id, amount')
          .in('expense_id', expIds)
        if (!splitsError && splitsData) splits = splitsData as any
      }

      // Settlements para estos grupos
      let settlements: Settlement[] = []
      try {
        const { data: stData, error: stError } = await supabase
          .from('settlements')
          .select('id, group_id, from_user_id, to_user_id, amount, created_at')
          .in('group_id', groupIds)
        if (!stError && stData) settlements = stData as any
      } catch {}

      // Calcular neto para current user
      let net = 0
      ;(allExpenses || []).forEach(e => {
        if (e.paid_by === userId) net += e.amount
      })
      splits.forEach(s => {
        if (s.user_id === userId) net -= s.amount
      })
      settlements.forEach(s => {
        if (s.from_user_id === userId) net += s.amount
        if (s.to_user_id === userId) net -= s.amount
      })

      setTotalOwedToYou(net > 0 ? net : 0)
      setTotalYouOwe(net < 0 ? Math.abs(net) : 0)
    } catch (err) {
      console.error('Error calculando resumen global', err)
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
    try {
      // Primero obtenemos el usuario actual
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No hay usuario autenticado')
      }

      console.log('=== DEBUG CREATE GROUP ===')
      console.log('Session user ID:', session.user.id)
      console.log('Session:', session)
      
      // TEST: Verificar que auth.uid() funcione desde el cliente
      const { data: testUid, error: testError } = await supabase.rpc('test_auth_uid')
      console.log('Test auth.uid() result:', { testUid, testError })

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
      
      if (error) {
        console.error('Error detallado:', error)
        alert('Error al crear el grupo: ' + (error.message || JSON.stringify(error)))
        return
      }
      
      console.log('Grupo creado:', data)
      
      setNewGroupName('')
      setNewGroupDesc('')
      fetchGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error al crear el grupo: ' + (error instanceof Error ? error.message : JSON.stringify(error)))
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Resumen global */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Resumen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded">
              <p className="text-sm text-gray-500">Te deben</p>
              <p className="text-2xl font-semibold text-green-600">${totalOwedToYou.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-gray-500">Debés</p>
              <p className="text-2xl font-semibold text-red-600">${totalYouOwe.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-gray-500">Neto</p>
              <p className="text-2xl font-semibold">${(totalOwedToYou - totalYouOwe).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Últimos gastos */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Últimos gastos</h2>
          {recentExpenses.length > 0 ? (
            <ul className="divide-y">
              {recentExpenses.slice(0,10).map(e => (
                <li key={e.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{e.description} <span className="text-gray-400">· {new Date(e.created_at).toLocaleDateString()}</span></p>
                    <p className="text-sm text-gray-500">{groups.find(g => g.id === e.group_id)?.name || 'Grupo'} — Pagado por {e.profiles?.full_name || e.paid_by.slice(0,8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${e.amount.toFixed(2)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hay gastos recientes</p>
          )}
        </div>
        {/* Crear nuevo grupo */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Crear nuevo grupo</h2>
          <form onSubmit={createGroup} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            >
              Crear Grupo
            </button>
          </form>
        </div>

        {/* Lista de grupos */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium mb-4">Tus grupos</h2>
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-4">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="border rounded p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => window.location.href = `/groups/${group.id}`}
                  >
                    <h3 className="font-medium">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-500 text-sm mt-1">{group.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No hay grupos todavía</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
