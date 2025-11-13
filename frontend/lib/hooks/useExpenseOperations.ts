import { useState } from 'react'
import { ExpenseService } from '../services/ExpenseService'
import type { CreateExpenseData, UpdateExpenseData, SplitType } from '../services/types'

/**
 * Hook personalizado para manejar operaciones de gastos
 * Responsabilidad: CRUD de gastos y estado del formulario
 */
export function useExpenseOperations(
  groupId: string, 
  memberIds: string[], 
  currentUserId: string,
  onSuccess: () => void
) {
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  /**
   * Crea un nuevo gasto
   */
  const createExpense = async (
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>,
    fullBeneficiaryId?: string
  ) => {
    setCreating(true)

    try {
      // Convertir customSplits de string a number
      const customSplitsNumbers = customSplits
        ? Object.entries(customSplits).reduce((acc, [userId, amountStr]) => {
            const num = parseFloat(amountStr)
            if (!isNaN(num)) {
              acc[userId] = num
            }
            return acc
          }, {} as Record<string, number>)
        : undefined

      const expenseData: CreateExpenseData = {
        description,
        amount,
        paid_by: paidBy,
        group_id: groupId,
        splitType,
        customSplits: customSplitsNumbers,
        memberIds,
        fullBeneficiaryId,
        created_by: currentUserId
      }

      const result = await ExpenseService.createExpense(expenseData)

      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Error al crear el gasto')
      }
    } catch (error) {
      alert('Error inesperado al crear el gasto')
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  /**
   * Actualiza un gasto existente
   */
  const updateExpense = async (
    expenseId: string,
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>,
    fullBeneficiaryId?: string
  ) => {
    setUpdating(true)

    try {
      // Convertir customSplits de string a number
      const customSplitsNumbers = customSplits
        ? Object.entries(customSplits).reduce((acc, [userId, amountStr]) => {
            const num = parseFloat(amountStr)
            if (!isNaN(num)) {
              acc[userId] = num
            }
            return acc
          }, {} as Record<string, number>)
        : undefined

      const updateData: UpdateExpenseData = {
        description,
        amount,
        paid_by: paidBy,
        splitType,
        customSplits: customSplitsNumbers,
        memberIds,
        fullBeneficiaryId,
        updated_by: currentUserId
      }

      const result = await ExpenseService.updateExpense(expenseId, updateData)

      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Error al actualizar el gasto')
      }
    } catch (error) {
      alert('Error inesperado al actualizar el gasto')
      console.error(error)
    } finally {
      setUpdating(false)
    }
  }

  /**
   * Elimina un gasto
   */
  const deleteExpense = async (expenseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      return
    }

    try {
      const result = await ExpenseService.deleteExpense(expenseId)

      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Error al eliminar el gasto')
      }
    } catch (error) {
      alert('Error inesperado al eliminar el gasto')
      console.error(error)
    }
  }

  return {
    createExpense,
    updateExpense,
    deleteExpense,
    creating,
    updating
  }
}
