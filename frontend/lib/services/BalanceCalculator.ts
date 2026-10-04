import type { Member, Expense, ExpenseSplit, Settlement, Balance } from './types'

/**
 * Balance calculator
 * Single responsibility: debt and balance calculation logic
 */
export class BalanceCalculator {
  /**
   * Calculates balances for all group members
   */
  static calculateBalances(
    members: Member[],
    expenses: Expense[],
    splits: ExpenseSplit[],
    settlements: Settlement[]
  ): Balance[] {
    const balanceMap = new Map<string, number>()

    // Initialize balances at 0
    members.forEach(m => balanceMap.set(m.user_id, 0))

    // Process expenses
    expenses.forEach(expense => {
      // Get splits for the expense
      const expenseSplits = splits.filter(s => s.expense_id === expense.id)
      // The payer should only receive what OTHERS owe them (sum of splits)
      // Previously the full expense amount was added, which inflated their balance.
      const totalOwedToPayer = expenseSplits.reduce((acc, s) => acc + s.amount, 0)
      const currentBalance = balanceMap.get(expense.paid_by) || 0
      balanceMap.set(expense.paid_by, currentBalance + totalOwedToPayer)

      // Debtors (beneficiaries other than the payer) subtract their share
      expenseSplits.forEach(split => {
        const userBalance = balanceMap.get(split.user_id) || 0
        balanceMap.set(split.user_id, userBalance - split.amount)
      })
    })

    // Apply settlements
    settlements.forEach(settlement => {
      // The payer (from) increases their balance
      const fromBalance = balanceMap.get(settlement.from_user_id) || 0
      balanceMap.set(settlement.from_user_id, fromBalance + settlement.amount)

      // The receiver (to) decreases their balance
      const toBalance = balanceMap.get(settlement.to_user_id) || 0
      balanceMap.set(settlement.to_user_id, toBalance - settlement.amount)
    })

    // Convert to Balance array
    return members.map(m => ({
      user_id: m.user_id,
      name: m.profiles?.full_name || m.user_id.slice(0, 8),
      balance: balanceMap.get(m.user_id) || 0
    }))
  }

  /**
   * Filters settlements relevant to the calculation
   * Only considers settlements after the oldest expense
   */
  static filterRelevantSettlements(
    expenses: Expense[],
    settlements: Settlement[]
  ): Settlement[] {
    if (expenses.length === 0) {
      return []
    }

    const oldestExpenseTime = Math.min(
      ...expenses.map(e => new Date(e.created_at).getTime())
    )

    return settlements.filter(s => 
      new Date(s.created_at).getTime() >= oldestExpenseTime
    )
  }

  /**
   * Calculates the individual balance of a specific user
   */
  static calculateUserBalance(
    userId: string,
    expenses: Expense[],
    splits: ExpenseSplit[],
    settlements: Settlement[]
  ): number {
    let balance = 0

    // Add what was paid
    expenses.forEach(expense => {
      if (expense.paid_by === userId) {
        // Use only what other members owe (sum of expense splits)
        const splitsForExpense = splits.filter(s => s.expense_id === expense.id)
        const totalOwedToPayer = splitsForExpense.reduce((acc, s) => acc + s.amount, 0)
        balance += totalOwedToPayer
      }
    })

    // Subtract what is owed
    splits.forEach(split => {
      if (split.user_id === userId) {
        balance -= split.amount
      }
    })

    // Apply settlements
    settlements.forEach(settlement => {
      if (settlement.from_user_id === userId) {
        balance += settlement.amount
      }
      if (settlement.to_user_id === userId) {
        balance -= settlement.amount
      }
    })

    return balance
  }

  /**
   * Identifies who owes whom and how much
   */
  static calculateDebts(balances: Balance[]): Array<{
    from: string
    to: string
    amount: number
  }> {
    const debts: Array<{ from: string; to: string; amount: number }> = []

    // Separate debtors and creditors
    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }))
    const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }))

    // Simple matching algorithm
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const debt = Math.abs(debtors[i].balance)
      const credit = creditors[j].balance

      const amount = Math.min(debt, credit)

      debts.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: parseFloat(amount.toFixed(2))
      })

      debtors[i].balance += amount
      creditors[j].balance -= amount

      if (Math.abs(debtors[i].balance) < 0.01) i++
      if (Math.abs(creditors[j].balance) < 0.01) j++
    }

    return debts
  }
}
