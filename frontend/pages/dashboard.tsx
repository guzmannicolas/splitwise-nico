import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuthUser } from '../lib/hooks/useAuthUser'
import { useGlobalSummary } from '../lib/hooks/useGlobalSummary'
import DashboardSummary from '../components/DashboardSummary'

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
  // Auth user centralizado
  const { user: authUser, loading: authLoading } = useAuthUser()

  // Estado UI y datos
  const [groups, setGroups] = useState<Group[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])

  // Summary hook (usa SummaryService)
  const { summary, loading: summaryLoading } = useGlobalSummary(authUser?.id || null)

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchGroups(authUser.id)
    } else if (!authLoading && !authUser) {
      setGroups([])
    }
  }, [authLoading, authUser])

  async function fetchGroups(userId: string) {
    try {
      setLoadingGroups(true)
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error obteniendo grupos:', error)
      }
      setGroups(data || [])
      // cargar gastos recientes tras tener grupos
      if (data && data.length > 0) {
        await fetchRecentExpenses(data.map(g => g.id))
      } else {
        setRecentExpenses([])
      }
    } catch (err) {
      console.error('Error fetching groups:', err)
    } finally {
      setLoadingGroups(false)
    }
  }

  async function fetchRecentExpenses(groupIds: string[]) {
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
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (!authUser) {
        throw new Error('No hay usuario autenticado')
      }
      const { data, error } = await supabase
        .from('groups')
        .insert([
          {
            name: newGroupName,
            description: newGroupDesc,
            created_by: authUser.id
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
      fetchGroups(authUser.id)
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error al crear el grupo: ' + (error instanceof Error ? error.message : JSON.stringify(error)))
    }
  }

  return (
    <Layout>
      <div className="space-y-6 px-2 py-4">
        {/* Resumen global */}
        <DashboardSummary summary={summary || null} loading={authLoading || summaryLoading} />

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
            {loadingGroups ? (
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
