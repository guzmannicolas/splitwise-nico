import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuthUser } from '../lib/hooks/useAuthUser'
import { useGlobalSummary } from '../lib/hooks/useGlobalSummary'
import DashboardSummary from '../components/DashboardSummary'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import RecentExpenses from '../components/dashboard/RecentExpenses'
import GroupsPanel from '../components/dashboard/GroupsPanel'
import CreateGroupForm from '../components/dashboard/CreateGroupForm'

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

type ViewType = 'summary' | 'expenses' | 'groups' | 'create'

export default function Dashboard() {
  // Auth user centralizado
  const { user: authUser, loading: authLoading } = useAuthUser()

  // Estado UI y datos
  const [activeView, setActiveView] = useState<ViewType>('summary')
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
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl shadow-xl mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-blue-100 mt-1">Administra tus grupos y finanzas</p>
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar izquierdo */}
          <div className="lg:col-span-1">
            <DashboardSidebar
              activeView={activeView}
              onChange={setActiveView}
              groupsCount={groups.length}
            />
          </div>

          {/* Contenido derecho */}
          <div className="lg:col-span-3">
            {activeView === 'summary' && (
              <DashboardSummary summary={summary || null} loading={authLoading || summaryLoading} />
            )}

            {activeView === 'expenses' && (
              <RecentExpenses expenses={recentExpenses} groups={groups} />
            )}

            {activeView === 'groups' && (
              <GroupsPanel groups={groups} loading={loadingGroups} summary={summary || null} />
            )}

            {activeView === 'create' && (
              <CreateGroupForm onCreate={async (name, description) => {
                const fakeEvent = { preventDefault: () => {} } as any
                setNewGroupName(name)
                setNewGroupDesc(description)
                await createGroup(fakeEvent)
              }} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
