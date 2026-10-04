import { useState, useEffect, useRef, useMemo } from 'react'
import { GroupService } from '../services/GroupService'
import { ExpenseService } from '../services/ExpenseService'
import { SettlementService } from '../services/SettlementService'
import { BalanceCalculator } from '../services/BalanceCalculator'
import type { Group, Member, Expense, ExpenseSplit, Settlement, Balance } from '../services/types'

/**
 * Custom hook for managing all group logic
 * Responsibility: Group state and operations
 */
export function useGroup(groupId: string | undefined, initialData?: {
  group: Group | null;
  members: Member[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  settlements: Settlement[];
}) {
  const [group, setGroup] = useState<Group | null>(initialData?.group || null)
  const [members, setMembers] = useState<Member[]>(initialData?.members || [])
  const [expenses, setExpenses] = useState<Expense[]>(initialData?.expenses || [])
  const [splits, setSplits] = useState<ExpenseSplit[]>(initialData?.splits || [])
  const [settlements, setSettlements] = useState<Settlement[]>(initialData?.settlements || [])
  
  // REACTIVE balances: recomputed whenever base data changes
  // This ensures that with SSR data the balance is available immediately
  const balances = useMemo(() => {
    const relevantSettlements = BalanceCalculator.filterRelevantSettlements(
      expenses,
      settlements
    )
    
    return BalanceCalculator.calculateBalances(
      members,
      expenses,
      splits,
      relevantSettlements
    )
  }, [members, expenses, splits, settlements])

  const [loading, setLoading] = useState(!initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref to avoid a double fetch when SSR data is already available
  const hasLoadedInitial = useRef(!!initialData)

  // Load group data
  useEffect(() => {
    if (!groupId) return

    // If SSR data was already loaded, skip the first automatic fetch
    // but mark that this is no longer the initial load for future groupId changes
    if (hasLoadedInitial.current) {
      hasLoadedInitial.current = false
      return
    }
    
    fetchGroupData()
  }, [groupId])

  const fetchGroupData = async (background = false) => {
    if (!groupId) return

    try {
      if (background) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // 1. Load group
      const { data: groupData, error: groupError } = await GroupService.getGroupById(groupId)
      if (groupError) throw new Error(groupError.message)
      setGroup(groupData)

      // 2. Load members
      const { data: membersData, error: membersError } = await GroupService.getGroupMembers(groupId)
      if (membersError) throw new Error(membersError.message)
      setMembers(membersData || [])

      // 3. Load expenses
      const { data: expensesData, error: expensesError } = await ExpenseService.getGroupExpenses(groupId)
      if (expensesError) throw new Error(expensesError.message)
      setExpenses(expensesData || [])

      // 4. Load splits
      const expenseIds = expensesData?.map(e => e.id) || []
      const { data: splitsData, error: splitsError } = await ExpenseService.getExpenseSplits(expenseIds)
      if (!splitsError) {
        setSplits(splitsData || [])
      }

      // 5. Load settlements
      const { data: settlementsData } = await SettlementService.getGroupSettlements(groupId)
      setSettlements(settlementsData || [])

      // Note: balances are no longer computed here — useMemo handles that automatically
      // when the states above are updated.

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading the group')
      console.error('Error in useGroup:', err)
    } finally {
      if (background) {
        setIsRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  return {
    group,
    members,
    expenses,
    splits,
    settlements,
    balances,
    loading,
    isRefreshing,
    error,
    refresh: fetchGroupData
  }
}
