import { useMemo } from 'react'
import { BalanceDetailService } from '../services/BalanceDetailService'
import type { Expense, ExpenseSplit, Settlement, Member, DebtDetail } from '../services/types'

/**
 * Hook for computing and managing debt details
 * Responsibility: encapsulate calculation and filtering logic
 */
export function useBalanceDetails(
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[],
  members: Member[],
  currentUserId: string | null
) {
  // Compute full details (memoized to avoid unnecessary recalculations)
  const allDetails = useMemo(() => {
    return BalanceDetailService.calculateDebtDetails(expenses, splits, settlements, members)
  }, [expenses, splits, settlements, members])

  // Filter debts for the current user
  const userDetails = useMemo(() => {
    if (!currentUserId) return { iOwe: [], oweMe: [] }
    return BalanceDetailService.filterByUser(allDetails, currentUserId)
  }, [allDetails, currentUserId])

  const iOwe = userDetails.iOwe || []
  const oweMe = userDetails.oweMe || []

  return {
    allDetails,      // All debts in the group
    iOwe,            // What I owe
    oweMe,           // What others owe me
    hasDebts: iOwe.length > 0 || oweMe.length > 0
  }
}
