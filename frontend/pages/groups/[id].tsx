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
import { GetServerSideProps } from 'next'
import { requireAuth } from '../../lib/authGuard'

/**
 * Group detail page - refactored with SOLID
 * Responsibility: coordinate components and handle navigation
 * Reduced from 1191 lines to ~250 lines
 */

interface GroupProps {
  user: { id: string; email: string | null }
  initialGroup: any
  initialMembers: any[]
  initialExpenses: any[]
  initialSplits: any[]
  initialSettlements: any[]
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await requireAuth(context)
  if ('redirect' in result) return result

  if (!('user' in result)) return { notFound: true }
  const { user, supabase } = result
  const groupId = context.params?.id as string

  // Parallel pre-fetch of basic data
  const [groupRes, membersRes, expensesRes, settlementsRes] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    supabase.from('group_members').select('user_id, profiles(full_name, email)').eq('group_id', groupId),
    supabase.from('expenses').select(`id, description, amount, paid_by, group_id, created_at, profiles:paid_by ( full_name )`).eq('group_id', groupId).order('created_at', { ascending: false }),
    supabase.from('settlements').select('*').eq('group_id', groupId),
  ])

  if (groupRes.error) {
    return { redirect: { destination: '/dashboard', permanent: false } }
  }

  // Fetch splits (based on the retrieved expenses)
  const expenseIds = expensesRes.data?.map(e => e.id) || []
  let splits: any[] = []
  if (expenseIds.length > 0) {
    const { data } = await supabase.from('expense_splits').select('*').in('expense_id', expenseIds)
    splits = data || []
  }

  return {
    props: {
      user,
      initialGroup: groupRes.data,
      initialMembers: membersRes.data || [],
      initialExpenses: expensesRes.data || [],
      initialSplits: splits,
      initialSettlements: settlementsRes.data || [],
    },
  }
}

export default function GroupDetail({
  user: serverUser,
  initialGroup,
  initialMembers,
  initialExpenses,
  initialSplits,
  initialSettlements,
}: GroupProps) {
  const router = useRouter()
  const { id } = router.query
  const groupId = typeof id === 'string' ? id : undefined

  // Custom hook for group data - updated to accept initial data
  const { group, members, expenses, splits, settlements, balances, loading, isRefreshing, error, refresh } = useGroup(groupId, {
    group: initialGroup,
    members: initialMembers,
    expenses: initialExpenses,
    splits: initialSplits,
    settlements: initialSettlements,
  })

  // Current user
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null)

  // UI state
  const [inviting, setInviting] = useState(false)
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)

  // Hook for expense operations
  const memberIds = members.map(m => m.user_id)
  const { createExpense, updateExpense, deleteExpense, creating } = useExpenseOperations(
    groupId || '',
    memberIds,
    currentUser?.id || '',
    () => refresh(true),
    members
  )

  // Hook for settlement operations
  const { createSettlement, deleteSettlement, creating: creatingSettlement } = useSettlementOperations(
    groupId || '',
    () => refresh(true),
    members
  )

  // Hook for balance details
  const { allDetails, iOwe, oweMe } = useBalanceDetails(
    expenses,
    splits,
    settlements,
    members,
    currentUser?.id || null
  )

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user ? { id: user.id, email: user.email || null } : null)
    })
  }, [])

  // Helper function to display names
  const displayNameFor = (userId: string): string => {
    const member = members.find(m => m.user_id === userId)
    if (member?.profiles?.full_name) return member.profiles.full_name
    if (currentUser && userId === currentUser.id) return currentUser.email || userId.slice(0, 8)
    return userId.slice(0, 8)
  }

  // Invite member
  const handleInvite = async (email: string) => {
    if (!currentUser || !groupId) return
    setInviting(true)
    try {
      const cleanEmail = email.trim().toLowerCase()

      // 1. Check if already a real member
      const isAlreadyMember = members.some(m => {
        const memberEmail = m.profiles?.email?.toLowerCase().trim()
        const memberUserId = m.user_id?.toLowerCase().trim()
        return memberEmail === cleanEmail || memberUserId === cleanEmail
      })

      if (isAlreadyMember) {
        alert('This user is already a member of the group: ' + cleanEmail)
        return
      }

      // 2. Check if there is already a pending invitation in the DB
      const { data: currentInvitations } = await GroupService.getGroupInvitations(groupId)
      const hasPending = currentInvitations?.some(inv =>
        inv.invited_email.toLowerCase().trim() === cleanEmail && inv.status === 'pending'
      )

      if (hasPending) {
        alert('A pending invitation already exists for: ' + cleanEmail)
        return
      }

      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '')
      const invitedByName = members.find(m => m.user_id === currentUser.id)?.profiles?.full_name || currentUser.email || 'Someone'
      const groupName = group?.name || 'a group'

      const invitationService = new InvitationService()
      const result = await invitationService.invite(groupId, cleanEmail, currentUser.id, siteUrl, invitedByName, groupName)

      if (!result.ok) {
        // Handle Supabase error if it somehow reaches here (e.g. race condition)
        if (result.message.includes('unique constraint') || result.message.includes('duplicate key')) {
          alert('An invitation has already been sent to this address recently.')
        } else {
          alert(result.message)
        }
      } else if (result.emailSent) {
        alert(result.message)
      } else if (result.manualLink) {
        alert(`${result.message}. Share this link:\n${result.manualLink}`)
      }
    } catch (err) {
      console.error(err)
      alert('Unexpected error in the invitation')
    } finally {
      setInviting(false)
    }
  }

  // Add guest user
  const handleAddGuest = async (fullName: string) => {
    if (!currentUser || !groupId) return
    const cleanName = fullName.trim()

    // Check if someone with that name already exists (real member or guest)
    const nameExists = members.some(m =>
      m.profiles?.full_name?.toLowerCase().trim() === cleanName.toLowerCase()
    )

    if (nameExists) {
      alert(`A member named "${cleanName}" already exists in this group.`)
      return
    }

    try {
      const { data, error } = await supabase.rpc('add_guest_to_group', {
        p_group_id: groupId,
        p_full_name: cleanName
      })

      if (error) throw error

      alert(`Guest "${cleanName}" added successfully`)
      refresh(true)
    } catch (err: any) {
      console.error('Error adding guest:', err)
      alert('Error adding guest: ' + (err?.message || String(err)))
    }
  }

  // Remove guest (simplified thanks to RLS and CASCADE)
  const handleRemoveGuest = async (userId: string) => {
    if (!groupId) return
    try {
      // Only remove from group_members, not from profiles
      // The user can still be referenced in expenses/settlements
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)

      if (error) throw error
      refresh(true)
    } catch (err: any) {
      console.error('Error removing guest:', err)

      // Specific message if the user lacks permissions
      const message = err?.code === 'PGRST301' || err?.message?.includes('policy')
        ? 'Only the group creator can remove members'
        : 'Could not remove the guest. Please try again later.'

      alert(message)
    }
  }

  // Leave the group
  const leaveGroup = async () => {
    if (!currentUser || !groupId) return
    if (!confirm('Are you sure you want to leave this group? This action cannot be undone.'))
      return

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      alert('You have left the group')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error leaving group', err)
      alert('Could not leave: ' + (err?.message || String(err)))
    }
  }

  // Delete group
  const deleteGroup = async () => {
    if (!currentUser || !group || !groupId) return

    if (group.created_by !== currentUser.id) {
      alert('Only the group creator can delete it')
      return
    }

    if (
      !confirm(
        'Are you sure you want to delete this group? All expenses and settlements will be deleted. This action cannot be undone.'
      )
    )
      return

    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)

      if (error) throw error

      alert('Group deleted')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error deleting group', err)
      alert('Could not delete: ' + (err?.message || String(err)))
    }
  }

  // Loading and error states
  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-center text-gray-500">Loading group...</p>
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
            Back to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-center text-gray-500">Group not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mx-auto block"
          >
            Back to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout serverUser={serverUser}>
      <div className="max-w-6xl mx-auto p-4">
        {/* Header del grupo */}
        <GroupHeader
          group={group}
          currentUserId={currentUser?.id || null}
          onLeave={leaveGroup}
          onDelete={deleteGroup}
        />

        {/* Grid de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Columna izquierda */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:space-y-6">
            <MemberList
              members={members}
              currentUserId={currentUser?.id || null}
              onInvite={handleInvite}
              onAddGuest={handleAddGuest}
              onRemoveGuest={handleRemoveGuest}
              inviting={inviting}
            />
            <BalanceCard
              balances={balances}
              onShowDetails={() => setShowBalanceDetails(true)}
            />
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expense creation button and form */}
            <ExpenseComposer
              members={members}
              onCreate={createExpense}
              creating={creating}
              displayNameFor={displayNameFor}
              currentUserId={currentUser?.id}
            />

            {/* Expense list */}
            <ExpenseList
              key={group?.id || 'expense-list'}
              expenses={expenses}
              splits={splits}
              members={members}
              currentUserId={currentUser?.id || null}
              onEdit={updateExpense}
              onDelete={deleteExpense}
              displayNameFor={displayNameFor}
              isRefreshing={isRefreshing}
            />

            {/* Settlement section */}
            <SettlementSection
              balances={balances}
              settlements={settlements}
              members={members}
              currentUserId={currentUser?.id || null}
              onCreateSettlement={createSettlement}
              onDeleteSettlement={deleteSettlement}
              creating={creatingSettlement}
              displayNameFor={displayNameFor}
              isRefreshing={isRefreshing}
            />

            {/* Historial de actividad */}
            <ActivityHistory
              key={group?.id ? `activity-${group.id}` : 'activity-list'}
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
