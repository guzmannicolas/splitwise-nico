import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Layout from '../../components/Layout'
import { useGroup } from '../../lib/hooks/useGroup'
import { useExpenseOperations } from '../../lib/hooks/useExpenseOperations'
import { GroupService } from '../../lib/services/GroupService'
import BalanceCard from '../../components/groups/BalanceCard'
import ExpenseForm from '../../components/groups/ExpenseForm'
import ExpenseList from '../../components/groups/ExpenseList'
import MemberList from '../../components/groups/MemberList'

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
  const { group, members, expenses, splits, balances, loading, error, refresh } = useGroup(groupId)

  // Usuario actual
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null)

  // UI estado
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Hook para operaciones de gastos
  const memberIds = members.map(m => m.user_id)
  const { createExpense, updateExpense, deleteExpense, creating } = useExpenseOperations(
    groupId || '',
    memberIds,
    () => {
      refresh()
      setShowExpenseForm(false)
    }
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

      // 1) Crear invitación en BD
      const { data: invitation, error } = await GroupService.inviteMember(groupId, email, currentUser.id)

      if (error) {
        alert('Error al invitar: ' + error.message)
        return
      }

      // 2) Enviar email vía Edge Function
      const token: string | undefined = invitation?.token
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '')
      const invitedByName = members.find(m => m.user_id === currentUser.id)?.profiles?.full_name || currentUser.email || 'Alguien'
      const groupName = group?.name || 'un grupo'

      if (!token) {
        console.warn('Invitación creada pero sin token. invitation =', invitation)
      } else {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            invitedEmail: email,
            invitedByName,
            groupName,
            token,
            siteUrl,
          },
        })

        if (emailError) {
          console.error('Error al enviar email:', emailError, 'Respuesta:', emailData)
          const manualLink = `${siteUrl}/accept-invite?token=${token}`
          alert(`Invitación creada, pero no se pudo enviar el email. Comparte este link: \n${manualLink}`)
        } else {
          alert('Invitación enviada correctamente por email')
        }
      }
    } catch (error) {
      alert('Error al enviar invitación')
      console.error(error)
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
              <p className="text-blue-100">{group.description}</p>
              <p className="text-xs text-blue-200 mt-2">
                Creado el {new Date(group.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                ← Dashboard
              </button>
              <button
                onClick={leaveGroup}
                className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Salir del grupo
              </button>
              {group.created_by === currentUser?.id && (
                <button
                  onClick={deleteGroup}
                  className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Eliminar grupo
                </button>
              )}
            </div>
          </div>
        </div>

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
            <BalanceCard balances={balances} />
          </div>

          {/* Columna derecha */}
          <div className="lg:col-span-2 space-y-6">
            {/* Botón para mostrar formulario */}
            {!showExpenseForm && (
              <button
                onClick={() => setShowExpenseForm(true)}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold text-lg rounded-xl hover:from-green-700 hover:to-teal-600 transition-all shadow-lg"
              >
                + Agregar Gasto
              </button>
            )}

            {/* Formulario de crear gasto */}
            {showExpenseForm && (
              <ExpenseForm
                members={members}
                onSubmit={createExpense}
                onCancel={() => setShowExpenseForm(false)}
                creating={creating}
                displayNameFor={displayNameFor}
              />
            )}

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
          </div>
        </div>
      </div>
    </Layout>
  )
}
