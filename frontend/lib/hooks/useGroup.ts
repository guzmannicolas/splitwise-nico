import { useState, useEffect } from 'react'
import { GroupService } from '../services/GroupService'
import { ExpenseService } from '../services/ExpenseService'
import { SettlementService } from '../services/SettlementService'
import { BalanceCalculator } from '../services/BalanceCalculator'
import type { Group, Member, Expense, ExpenseSplit, Settlement, Balance } from '../services/types'

/**
 * Hook personalizado para manejar toda la lógica de un grupo
 * Responsabilidad: Estado y operaciones del grupo
 */
export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos del grupo
  useEffect(() => {
    if (!groupId) return
    
    fetchGroupData()
  }, [groupId])

  const fetchGroupData = async () => {
    if (!groupId) return

    try {
      setLoading(true)
      setError(null)

      // 1. Cargar grupo
      const { data: groupData, error: groupError } = await GroupService.getGroupById(groupId)
      if (groupError) throw new Error(groupError.message)
      setGroup(groupData)

      // 2. Cargar miembros
      const { data: membersData, error: membersError } = await GroupService.getGroupMembers(groupId)
      if (membersError) throw new Error(membersError.message)
      setMembers(membersData || [])

      // 3. Cargar gastos
      const { data: expensesData, error: expensesError } = await ExpenseService.getGroupExpenses(groupId)
      if (expensesError) throw new Error(expensesError.message)
      setExpenses(expensesData || [])

      // 4. Cargar splits
      const expenseIds = expensesData?.map(e => e.id) || []
      const { data: splitsData, error: splitsError } = await ExpenseService.getExpenseSplits(expenseIds)
      if (!splitsError) {
        setSplits(splitsData || [])
      }

      // 5. Cargar liquidaciones
      const { data: settlementsData } = await SettlementService.getGroupSettlements(groupId)
      setSettlements(settlementsData || [])

      // 6. Calcular balances
      const relevantSettlements = BalanceCalculator.filterRelevantSettlements(
        expensesData || [],
        settlementsData || []
      )
      
      const calculatedBalances = BalanceCalculator.calculateBalances(
        membersData || [],
        expensesData || [],
        splitsData || [],
        relevantSettlements
      )
      
      setBalances(calculatedBalances)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el grupo')
      console.error('Error en useGroup:', err)
    } finally {
      setLoading(false)
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
    error,
    refresh: fetchGroupData
  }
}
