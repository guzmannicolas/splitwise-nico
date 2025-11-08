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
      <div className="space-y-6 px-2 py-4">
        {/* Resumen global */}
        <div className="bg-gradient-to-br from-white to-blue-50 shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-6">Resumen General</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl shadow-md border border-green-200">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Te deben</p>
              <p className="text-3xl font-extrabold text-green-600 mt-2">${totalOwedToYou.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md border border-red-200">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Debés</p>
              <p className="text-3xl font-extrabold text-red-600 mt-2">${totalYouOwe.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
              <p className="text-sm font-semibold uppercase tracking-wide">Neto</p>
              <p className="text-3xl font-extrabold mt-2">${(totalOwedToYou - totalYouOwe).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Últimos gastos */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Últimos gastos</h2>
          {recentExpenses.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentExpenses.slice(0,10).map(e => (
                <li key={e.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-blue-50 transition-colors px-2 rounded">
                  <div>
                    <p className="font-semibold text-gray-800">{e.description} <span className="text-gray-400 text-sm">· {new Date(e.created_at).toLocaleDateString()}</span></p>
                    <p className="text-sm text-gray-500 mt-1">{groups.find(g => g.id === e.group_id)?.name || 'Grupo'} — Pagado por {e.profiles?.full_name || e.paid_by.slice(0,8)}</p>
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

        {/* Lista de grupos */}
        <div className="bg-white shadow-xl rounded-2xl border border-blue-100">
          <div className="px-6 py-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-6">Tus grupos</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
              </div>
            ) : groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-5 hover:shadow-lg hover:scale-99 cursor-pointer transition-all duration-200"
                    onClick={() => window.location.href = `/groups/${group.id}`}
                  >
                    <h3 className="font-bold text-lg text-blue-800">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-600 text-sm mt-2">{group.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No hay grupos todavía</p>
            )}
          </div>
        </div>
                {/* Crear nuevo grupo */}
        <div className="bg-gradient-to-br from-white to-indigo-50 shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Crear nuevo grupo</h2>
          <form onSubmit={createGroup} className="space-y-4">
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
            <div>
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold p-3 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200"
            >
              Crear Grupo
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
