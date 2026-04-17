import { useState, useEffect, useRef, useMemo } from 'react'
import { GroupService } from '../services/GroupService'
import { ExpenseService } from '../services/ExpenseService'
import { SettlementService } from '../services/SettlementService'
import { BalanceCalculator } from '../services/BalanceCalculator'
import type { Group, Member, Expense, ExpenseSplit, Settlement, Balance } from '../services/types'

/**
 * Hook personalizado para manejar toda la lógica de un grupo
 * Responsabilidad: Estado y operaciones del grupo
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
  
  // Balances REACTIVOS: se recalculan siempre que cambien los datos base
  // Esto asegura que con los datos de SSR, el balance esté listo al instante
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

  // Ref para evitar doble fetch si ya tenemos datos de SSR
  const hasLoadedInitial = useRef(!!initialData)

  // Cargar datos del grupo
  useEffect(() => {
    if (!groupId) return
    
    // Si ya cargamos datos por SSR, la primera vez saltamos el fetch automático
    // pero marcamos que ya no es la carga inicial para futuros cambios de groupId
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

      // Nota: Ya no calculamos balances aquí porque useMemo se encarga automáticamente
      // al actualizar los estados arriba.

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el grupo')
      console.error('Error en useGroup:', err)
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
