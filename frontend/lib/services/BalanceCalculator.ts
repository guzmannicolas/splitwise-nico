import type { Member, Expense, ExpenseSplit, Settlement, Balance } from './types'

/**
 * Calculadora de balances
 * Responsabilidad única: Lógica de cálculo de deudas y balances
 */
export class BalanceCalculator {
  /**
   * Calcula los balances de todos los miembros del grupo
   */
  static calculateBalances(
    members: Member[],
    expenses: Expense[],
    splits: ExpenseSplit[],
    settlements: Settlement[]
  ): Balance[] {
    const balanceMap = new Map<string, number>()

    // Inicializar balances en 0
    members.forEach(m => balanceMap.set(m.user_id, 0))

    // Procesar gastos
    expenses.forEach(expense => {
      // Obtener splits del gasto
      const expenseSplits = splits.filter(s => s.expense_id === expense.id)
      // El pagador solo debe recibir el monto que OTROS le deben (suma de splits)
      // Antes se sumaba el monto completo del gasto, lo que inflaba su balance.
      const totalOwedToPayer = expenseSplits.reduce((acc, s) => acc + s.amount, 0)
      const currentBalance = balanceMap.get(expense.paid_by) || 0
      balanceMap.set(expense.paid_by, currentBalance + totalOwedToPayer)

      // Los deudores (beneficiarios distintos del pagador) restan su parte
      expenseSplits.forEach(split => {
        const userBalance = balanceMap.get(split.user_id) || 0
        balanceMap.set(split.user_id, userBalance - split.amount)
      })
    })

    // Aplicar liquidaciones
    settlements.forEach(settlement => {
      // El que pagó (from) aumenta su balance
      const fromBalance = balanceMap.get(settlement.from_user_id) || 0
      balanceMap.set(settlement.from_user_id, fromBalance + settlement.amount)

      // El que recibió (to) disminuye su balance
      const toBalance = balanceMap.get(settlement.to_user_id) || 0
      balanceMap.set(settlement.to_user_id, toBalance - settlement.amount)
    })

    // Convertir a array de Balance
    return members.map(m => ({
      user_id: m.user_id,
      name: m.profiles?.full_name || m.user_id.slice(0, 8),
      balance: balanceMap.get(m.user_id) || 0
    }))
  }

  /**
   * Filtra liquidaciones relevantes para el cálculo
   * Solo considera liquidaciones posteriores al gasto más antiguo
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
   * Calcula el balance individual de un usuario específico
   */
  static calculateUserBalance(
    userId: string,
    expenses: Expense[],
    splits: ExpenseSplit[],
    settlements: Settlement[]
  ): number {
    let balance = 0

    // Sumar lo que pagó
    expenses.forEach(expense => {
      if (expense.paid_by === userId) {
        // Usar sólo lo que otros miembros le deben (suma de splits del gasto)
        const splitsForExpense = splits.filter(s => s.expense_id === expense.id)
        const totalOwedToPayer = splitsForExpense.reduce((acc, s) => acc + s.amount, 0)
        balance += totalOwedToPayer
      }
    })

    // Restar lo que debe
    splits.forEach(split => {
      if (split.user_id === userId) {
        balance -= split.amount
      }
    })

    // Aplicar liquidaciones
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
   * Identifica quién le debe a quién y cuánto
   */
  static calculateDebts(balances: Balance[]): Array<{
    from: string
    to: string
    amount: number
  }> {
    const debts: Array<{ from: string; to: string; amount: number }> = []
    
    // Separar deudores y acreedores
    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }))
    const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }))

    // Algoritmo simple de matching
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
