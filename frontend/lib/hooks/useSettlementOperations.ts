import { useState } from 'react'
import { SettlementService } from '../services/SettlementService'

export function useSettlementOperations(groupId: string, onSuccess?: () => void) {
  const [creating, setCreating] = useState(false)

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
        alert('Error al registrar liquidación: ' + (error || 'Desconocido'))
        return
      }

      alert('Liquidación registrada exitosamente')
      onSuccess?.()
    } catch (err) {
      console.error('Error creando liquidación:', err)
      alert('Error inesperado al registrar liquidación')
    } finally {
      setCreating(false)
    }
  }

  const deleteSettlement = async (settlementId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta liquidación?')) return

    try {
      const { success, error } = await SettlementService.deleteSettlement(settlementId)

      if (!success) {
        alert('Error al eliminar liquidación: ' + (error || 'Desconocido'))
        return
      }

      alert('Liquidación eliminada')
      onSuccess?.()
    } catch (err) {
      console.error('Error eliminando liquidación:', err)
      alert('Error inesperado al eliminar liquidación')
    }
  }

  return { createSettlement, deleteSettlement, creating }
}
