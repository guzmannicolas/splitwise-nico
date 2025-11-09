import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Layout from '../../components/Layout'
import { useGroup } from '../../lib/hooks/useGroup'
import { useExpenseOperations } from '../../lib/hooks/useExpenseOperations'
import { useSettlementOperations } from '../../lib/hooks/useSettlementOperations'
import { GroupService } from '../../lib/services/GroupService'
import { InvitationService } from '../../lib/services/InvitationService'
import BalanceCard from '../../components/groups/BalanceCard'
import ExpenseComposer from '../../components/groups/ExpenseComposer'
import ExpenseList from '../../components/groups/ExpenseList'
import MemberList from '../../components/groups/MemberList'
import SettlementSection from '../../components/groups/SettlementSection'
import ActivityHistory from '../../components/groups/ActivityHistory'
import GroupHeader from '../../components/groups/GroupHeader'
import BalanceDetailsModal from '../../components/groups/BalanceDetailsModal'
import { useBalanceDetails } from '../../lib/hooks/useBalanceDetails'

/**
 * Página de detalle de grupo - REFACTORIZADA CON SOLID
 * Responsabilidad: Coordinar componentes y manejar navegación
 * Reducida de 1191 líneas a ~250 líneas
 */
export default function GroupDetail() {
  const router = useRouter()
  const { id } = router.query
  const groupId = typeof id === 'string' ? id : undefined

  // Hook personalizado para datos del grupo
  const { group, members, expenses, splits, settlements, balances, loading, error, refresh } = useGroup(groupId)

  // Usuario actual
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null)

  // UI estado
  const [inviting, setInviting] = useState(false)
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)

  // Hook para operaciones de gastos
  const memberIds = members.map(m => m.user_id)
  const { createExpense, updateExpense, deleteExpense, creating } = useExpenseOperations(
    groupId || '',
    memberIds,
    currentUser?.id || '',
    refresh
  )

  // Hook para operaciones de liquidaciones
  const { createSettlement, deleteSettlement, creating: creatingSettlement } = useSettlementOperations(
    groupId || '',
    refresh
  )

  // Hook para detalles de balances
  const { allDetails, iOwe, oweMe } = useBalanceDetails(
    expenses,
    splits,
    settlements,
    members,
    currentUser?.id || null
  )

  // Obtener usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user ? { id: user.id, email: user.email || null } : null)
    })
  }, [])

  // Función helper para mostrar nombres
  const displayNameFor = (userId: string): string => {
    const member = members.find(m => m.user_id === userId)
    if (member?.profiles?.full_name) return member.profiles.full_name
    if (currentUser && userId === currentUser.id) return currentUser.email || userId.slice(0, 8)
    return userId.slice(0, 8)
  }

  // Invitar miembro
  const handleInvite = async (email: string) => {
    if (!currentUser || !groupId) return
    setInviting(true)
    try {
      // Verificar si ya es miembro
      const isAlreadyMember = members.some(
        m => m.profiles?.email === email || m.user_id === email
      )
      if (isAlreadyMember) {
        alert('Este usuario ya es miembro del grupo')
        return
      }

      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '')
      const invitedByName = members.find(m => m.user_id === currentUser.id)?.profiles?.full_name || currentUser.email || 'Alguien'
      const groupName = group?.name || 'un grupo'

      const invitationService = new InvitationService()
      const result = await invitationService.invite(groupId, email, currentUser.id, siteUrl, invitedByName, groupName)

      if (!result.ok) {
        alert(result.message)
      } else if (result.emailSent) {
        alert(result.message)
      } else if (result.manualLink) {
        alert(`${result.message}. Comparte este link:\n${result.manualLink}`)
      }
    } catch (err) {
      console.error(err)
      alert('Error inesperado en la invitación')
    } finally {
      setInviting(false)
    }
  }

  // Salir del grupo
  const leaveGroup = async () => {
    if (!currentUser || !groupId) return
    if (!confirm('¿Estás seguro de salir de este grupo? Esta acción no se puede deshacer.'))
      return

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      alert('Has salido del grupo')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error al salir del grupo', err)
      alert('No se pudo salir: ' + (err?.message || String(err)))
    }
  }

  // Eliminar grupo
  const deleteGroup = async () => {
    if (!currentUser || !group || !groupId) return

    if (group.created_by !== currentUser.id) {
      alert('Solo el creador del grupo puede eliminarlo')
      return
    }

    if (
      !confirm(
        '¿Estás seguro de eliminar este grupo? Se eliminarán todos los gastos y liquidaciones. Esta acción no se puede deshacer.'
      )
    )
      return

    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)

      if (error) throw error

      alert('Grupo eliminado')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error al eliminar grupo', err)
      alert('No se pudo eliminar: ' + (err?.message || String(err)))
    }
  }

  // Estados de carga y error
  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-center text-gray-500">Cargando grupo...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-center text-red-500">Error: {error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mx-auto block"
          >
            Volver al Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-center text-gray-500">Grupo no encontrado</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mx-auto block"
          >
            Volver al Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        {/* Header del grupo */}
        <GroupHeader
          group={group}
          currentUserId={currentUser?.id || null}
          onLeave={leaveGroup}
          onDelete={deleteGroup}
        />

        {/* Grid de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-6">
            <MemberList
              members={members}
              currentUserId={currentUser?.id || null}
              onInvite={handleInvite}
              inviting={inviting}
            />
            <BalanceCard 
              balances={balances} 
              onShowDetails={() => setShowBalanceDetails(true)}
            />
          </div>

          {/* Columna derecha */}
          <div className="lg:col-span-2 space-y-6">
            {/* Botón y formulario de crear gasto */}
            <ExpenseComposer
              members={members}
              onCreate={createExpense}
              creating={creating}
              displayNameFor={displayNameFor}
            />

            {/* Lista de gastos */}
            <ExpenseList
              expenses={expenses}
              splits={splits}
              members={members}
              currentUserId={currentUser?.id || null}
              onEdit={updateExpense}
              onDelete={deleteExpense}
              displayNameFor={displayNameFor}
            />

            {/* Sección de liquidaciones */}
            <SettlementSection
              balances={balances}
              settlements={settlements}
              members={members}
              currentUserId={currentUser?.id || null}
              onCreateSettlement={createSettlement}
              onDeleteSettlement={deleteSettlement}
              creating={creatingSettlement}
              displayNameFor={displayNameFor}
            />

            {/* Historial de actividad */}
            <ActivityHistory
              expenses={expenses}
              settlements={settlements}
              displayNameFor={displayNameFor}
            />
          </div>
        </div>

        {/* Modal de detalles de balances */}
        <BalanceDetailsModal
          isOpen={showBalanceDetails}
          onClose={() => setShowBalanceDetails(false)}
          allDetails={allDetails}
          currentUserId={currentUser?.id || null}
          onCreateSettlement={async (fromUserId, toUserId, amount) => {
            await createSettlement(fromUserId, toUserId, amount)
            setShowBalanceDetails(false)
          }}
          creatingSettlement={creatingSettlement}
        />
      </div>
    </Layout>
  )
}
