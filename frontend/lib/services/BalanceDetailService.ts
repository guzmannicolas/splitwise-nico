import type { Expense, ExpenseSplit, Settlement, Member, DebtDetail } from './types'

/**
 * Service for calculating person-to-person debt details
 * Single responsibility: transform expenses + splits + settlements into net debt relationships
 */
export class BalanceDetailService {
  /**
   * Calculates detailed debts between pairs of users
   * @param expenses - List of group expenses
   * @param splits - List of all splits
   * @param settlements - List of recorded settlements
   * @param members - Group members for name lookup
   * @returns Array of detailed debts with names included
   */
  static calculateDebtDetails(
    expenses: Expense[],
    splits: ExpenseSplit[],
    settlements: Settlement[],
    members: Member[]
  ): DebtDetail[] {
    // Auxiliary map for names
    const nameMap = new Map<string, string>()
    members.forEach(m => {
      nameMap.set(m.user_id, m.profiles?.full_name || m.user_id.slice(0, 8))
    })

    // Expense map for fast lookup
    const expenseMap = new Map<string, Expense>()
    expenses.forEach(exp => expenseMap.set(exp.id, exp))

    // 1. Accumulate debts from expense_splits
    // Structure: Map<"debtor->creditor", amount>
    const debtMatrix = new Map<string, number>()

    splits.forEach(split => {
      const expense = expenseMap.get(split.expense_id)
      if (!expense) return

      const debtor = split.user_id
      const creditor = expense.paid_by

      // The debtor owes the payer
      if (debtor !== creditor) {
        const key = `${debtor}->${creditor}`
        const current = debtMatrix.get(key) || 0
        debtMatrix.set(key, current + split.amount)
      }
    })

    // 2. Subtract settlements from accumulated debts
    settlements.forEach(settlement => {
      const key = `${settlement.from_user_id}->${settlement.to_user_id}`
      const current = debtMatrix.get(key) || 0
      debtMatrix.set(key, current - settlement.amount)
    })

    // 3. Net bilateral debts: if A->B and B->A both exist, show only the net
    // pairNet stores the net in [minId|maxId] order
    const pairNet = new Map<string, { a: string; b: string; net: number }>()
    debtMatrix.forEach((amount, key) => {
      if (Math.abs(amount) < 0.01) return
      const [from, to] = key.split('->')
      const [minId, maxId] = [from, to].sort()
      const pKey = `${minId}|${maxId}`
      const rec = pairNet.get(pKey) || { a: minId, b: maxId, net: 0 }
      // If direction matches min->max add, if reversed subtract
      const delta = from === minId ? amount : -amount
      rec.net += delta
      pairNet.set(pKey, rec)
    })

    const details: DebtDetail[] = []
    pairNet.forEach(({ a, b, net }) => {
      const rounded = Math.round(net * 100) / 100
      if (Math.abs(rounded) < 0.01) return
      // net > 0 means a->b; net < 0 means b->a
      const from_user_id = rounded > 0 ? a : b
      const to_user_id = rounded > 0 ? b : a
      const amount = Math.abs(rounded)
      details.push({
        from_user_id,
        to_user_id,
        amount,
        debtor_name: nameMap.get(from_user_id) || from_user_id.slice(0, 8),
        creditor_name: nameMap.get(to_user_id) || to_user_id.slice(0, 8)
      })
    })

    // 4. Sort: highest amounts first
    details.sort((a, b) => b.amount - a.amount)

    return details
  }

  /**
   * Filters debts relevant to a specific user
   * @param details - Full debt details
   * @param userId - User to filter by
   * @returns Object with debts the user owes and debts in their favour
   */
  static filterByUser(details: DebtDetail[], userId: string) {
    const iOwe = details.filter(d => d.from_user_id === userId && d.amount > 0)
    const oweMe = details.filter(d => d.to_user_id === userId && d.amount > 0)

    return { iOwe, oweMe }
  }
}
