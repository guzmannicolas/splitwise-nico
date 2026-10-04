import { useState } from 'react'
import { SettlementService } from '../services/SettlementService'
import { NotificationService } from '../services/NotificationService'
import type { Member } from '../services/types'

export function useSettlementOperations(groupId: string, onSuccess?: () => void, members: Member[] = []) {
  const [creating, setCreating] = useState(false)

  const getMemberName = (userId: string) =>
    members.find(m => m.user_id === userId)?.profiles?.full_name ?? 'Someone'

  const createSettlement = async (fromUserId: string, toUserId: string, amount: number) => {
    setCreating(true)
    try {
      const { success, error } = await SettlementService.createSettlement(
        groupId,
        fromUserId,
        toUserId,
        amount
      )

      if (!success) {
        alert('Failed to record settlement: ' + (error || 'Unknown error'))
        return
      }

      alert('Settlement recorded successfully')
      onSuccess?.()
      NotificationService.notifySettlement(groupId, getMemberName(fromUserId), getMemberName(toUserId), amount)
    } catch (err) {
      console.error('Error creating settlement:', err)
      alert('Unexpected error while recording settlement')
    } finally {
      setCreating(false)
    }
  }

  const deleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to delete this settlement?')) return

    try {
      const { success, error } = await SettlementService.deleteSettlement(settlementId)

      if (!success) {
        alert('Failed to delete settlement: ' + (error || 'Unknown error'))
        return
      }

      alert('Settlement deleted')
      onSuccess?.()
    } catch (err) {
      console.error('Error deleting settlement:', err)
      alert('Unexpected error while deleting settlement')
    }
  }

  return { createSettlement, deleteSettlement, creating }
}
