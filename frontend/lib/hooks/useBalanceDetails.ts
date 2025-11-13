import { useMemo } from 'react'
import { BalanceDetailService } from '../services/BalanceDetailService'
import type { Expense, ExpenseSplit, Settlement, Member, DebtDetail } from '../services/types'

/**
 * Hook para calcular y gestionar detalles de deudas
 * Responsabilidad: encapsular lógica de cálculo y filtrado
 */
export function useBalanceDetails(
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[],
  members: Member[],
  currentUserId: string | null
) {
  // Calcular detalles completos (memoizado para evitar recálculos)
  const allDetails = useMemo(() => {
    return BalanceDetailService.calculateDebtDetails(expenses, splits, settlements, members)
  }, [expenses, splits, settlements, members])

  // Filtrar deudas del usuario actual
  const userDetails = useMemo(() => {
    if (!currentUserId) return { iOwe: [], oweMe: [] }
    return BalanceDetailService.filterByUser(allDetails, currentUserId)
  }, [allDetails, currentUserId])

  const iOwe = userDetails.iOwe || []
  const oweMe = userDetails.oweMe || []

  return {
    allDetails,      // Todas las deudas del grupo
    iOwe,            // Lo que yo debo
    oweMe,           // Lo que me deben
    hasDebts: iOwe.length > 0 || oweMe.length > 0
  }
}
