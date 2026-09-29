import { GetServerSideProps } from 'next'
import Layout from '../components/Layout'
import { requireAuth } from '../lib/authGuard'
import { supabaseAdmin } from '../lib/supabaseAdmin'

interface AdminStats {
  totalUsers: number
  totalGroups: number
  totalExpenses: number
  totalExpenseAmount: number
  totalSettlements: number
  totalSettlementAmount: number
  activeUsers: number
  pushSubs: number
  pendingInvites: number
}

interface RecentUser {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

interface TopGroup {
  id: string
  name: string
  count: number
  total: number
  memberCount: number
}

interface ActivityItem {
  id: string
  description: string
  amount: number
  created_at: string
  groupName: string
  paidByName: string
}

interface AdminProps {
  user: { id: string; email: string | null }
  stats: AdminStats
  recentUsers: RecentUser[]
  topGroups: TopGroup[]
  recentActivity: ActivityItem[]
}

function StatCard({
  label, value, subValue, icon, bg,
}: {
  label: string
  value: string | number
  subValue?: string
  icon: string
  bg: string
}) {
  return (
    <div className="bg-white dark:bg-slate-900 shadow-lg rounded-2xl p-5 border border-gray-200 dark:border-slate-800 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bg}`}>{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{value}</p>
      {subValue && (
        <p className="text-sm text-gray-500 dark:text-slate-400">{subValue}</p>
      )}
    </div>
  )
}

function fmt(amount: number) {
  return `$${Math.round(amount).toLocaleString('es-AR')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function AdminPage({ user, stats, recentUsers, topGroups, recentActivity }: AdminProps) {
  return (
    <Layout serverUser={user}>
      <div className="space-y-8 pb-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">
              Panel de Administración
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Vista general del sistema · datos al momento de cargar
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            Admin
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard
            icon="👥" label="Usuarios"
            value={stats.totalUsers}
            subValue={`${stats.activeUsers} activos últimos 30d`}
            bg="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          />
          <StatCard
            icon="🏘️" label="Grupos"
            value={stats.totalGroups}
            bg="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          />
          <StatCard
            icon="💰" label="Gastos"
            value={stats.totalExpenses}
            subValue={fmt(stats.totalExpenseAmount) + ' total'}
            bg="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          />
          <StatCard
            icon="✅" label="Liquidaciones"
            value={stats.totalSettlements}
            subValue={fmt(stats.totalSettlementAmount) + ' total'}
            bg="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
          />
          <StatCard
            icon="⚡" label="Activos 30d"
            value={stats.activeUsers}
            bg="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          />
          <StatCard
            icon="🔔" label="Push suscritos"
            value={stats.pushSubs}
            bg="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300"
          />
          <StatCard
            icon="✉️" label="Invitaciones pend."
            value={stats.pendingInvites}
            bg="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
          />
        </div>

        {/* Two tables side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent users */}
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-gray-900 dark:text-slate-100">Últimos usuarios registrados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-6 py-3 text-left font-semibold">Email</th>
                    <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">
                        Sin usuarios
                      </td>
                    </tr>
                  ) : recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-slate-100 truncate max-w-[140px]">
                        {u.full_name || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 truncate max-w-[160px]">
                        {u.email || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {fmtDate(u.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top groups */}
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-gray-900 dark:text-slate-100">Grupos más activos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left font-semibold">Grupo</th>
                    <th className="px-6 py-3 text-center font-semibold">Miembros</th>
                    <th className="px-6 py-3 text-center font-semibold">Gastos</th>
                    <th className="px-6 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {topGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">
                        Sin grupos
                      </td>
                    </tr>
                  ) : topGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-slate-100 truncate max-w-[160px]">
                        {g.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 text-center">
                        {g.memberCount}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 text-center">
                        {g.count}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-slate-100 text-right">
                        {fmt(g.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-bold text-gray-900 dark:text-slate-100">Actividad reciente</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Últimos 10 gastos registrados en toda la app</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left font-semibold">Descripción</th>
                  <th className="px-6 py-3 text-left font-semibold">Grupo</th>
                  <th className="px-6 py-3 text-left font-semibold">Pagó</th>
                  <th className="px-6 py-3 text-right font-semibold">Monto</th>
                  <th className="px-6 py-3 text-right font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">
                      Sin actividad
                    </td>
                  </tr>
                ) : recentActivity.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-slate-100 truncate max-w-[180px]">
                      {a.description}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 truncate max-w-[120px]">
                      {a.groupName}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 truncate max-w-[120px]">
                      {a.paidByName}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-slate-100 text-right whitespace-nowrap">
                      {fmt(a.amount)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 text-right whitespace-nowrap">
                      {fmtDate(a.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await requireAuth(context)
  if ('redirect' in result) return result

  const { supabase, user } = result as { supabase: any; user: { id: string; email: string | null } }

  // Verify admin status using the user's own session (RLS allows self-select)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return { redirect: { destination: '/dashboard', permanent: false } }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: totalGroups },
    { data: allExpenses },
    { data: allSettlements },
    { count: pushSubs },
    { count: pendingInvites },
    { data: recentExpensesForActive },
    { data: recentUsers },
    { data: expensesByGroup },
    { data: membersByGroup },
    { data: recentActivityRaw },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_guest', false),
    supabaseAdmin.from('groups').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('expenses').select('amount'),
    supabaseAdmin.from('settlements').select('amount').is('deleted_at', null),
    supabaseAdmin.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('group_invitations').select('*', { count: 'exact', head: true })
      .eq('status', 'pending').gt('expires_at', new Date().toISOString()),
    supabaseAdmin.from('expenses').select('paid_by').gte('created_at', thirtyDaysAgo),
    supabaseAdmin.from('profiles').select('id, full_name, email, created_at')
      .eq('is_guest', false).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('expenses').select('group_id, amount, groups(name)'),
    supabaseAdmin.from('group_members').select('group_id'),
    supabaseAdmin.from('expenses')
      .select('id, description, amount, created_at, groups(name), profiles!paid_by(full_name)')
      .order('created_at', { ascending: false }).limit(10),
  ])

  const activeUsers = new Set((recentExpensesForActive ?? []).map((e: any) => e.paid_by)).size
  const totalExpenseAmount = (allExpenses ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalSettlementAmount = (allSettlements ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)

  // Build top groups from expense data
  const groupExpenseMap: Record<string, { id: string; name: string; count: number; total: number }> = {}
  for (const e of expensesByGroup ?? []) {
    const ex = e as any
    if (!groupExpenseMap[ex.group_id]) {
      groupExpenseMap[ex.group_id] = { id: ex.group_id, name: ex.groups?.name ?? '', count: 0, total: 0 }
    }
    groupExpenseMap[ex.group_id].count++
    groupExpenseMap[ex.group_id].total += Number(ex.amount)
  }
  const memberCountMap: Record<string, number> = {}
  for (const m of membersByGroup ?? []) {
    const gm = m as any
    memberCountMap[gm.group_id] = (memberCountMap[gm.group_id] ?? 0) + 1
  }
  const topGroups: TopGroup[] = Object.values(groupExpenseMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(g => ({ ...g, memberCount: memberCountMap[g.id] ?? 0 }))

  const recentActivity: ActivityItem[] = (recentActivityRaw ?? []).map((e: any) => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    created_at: e.created_at,
    groupName: e.groups?.name ?? '',
    paidByName: e.profiles?.full_name ?? '',
  }))

  return {
    props: {
      user,
      stats: {
        totalUsers: totalUsers ?? 0,
        totalGroups: totalGroups ?? 0,
        totalExpenses: (allExpenses ?? []).length,
        totalExpenseAmount,
        totalSettlements: (allSettlements ?? []).length,
        totalSettlementAmount,
        activeUsers,
        pushSubs: pushSubs ?? 0,
        pendingInvites: pendingInvites ?? 0,
      },
      recentUsers: recentUsers ?? [],
      topGroups,
      recentActivity,
    },
  }
}
