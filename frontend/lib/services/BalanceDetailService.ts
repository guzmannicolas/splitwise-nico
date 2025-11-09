import type { Expense, ExpenseSplit, Settlement, Member, DebtDetail } from './types'

/**
 * Servicio para calcular detalles de deudas persona-a-persona
 * Responsabilidad única: transformar expenses + splits + settlements en relaciones de deuda netas
 */
export class BalanceDetailService {
  /**
   * Calcula las deudas detalladas entre pares de usuarios
   * @param expenses - Lista de gastos del grupo
   * @param splits - Lista de todos los splits
   * @param settlements - Lista de liquidaciones realizadas
   * @param members - Miembros del grupo para obtener nombres
   * @returns Array de deudas detalladas con nombres incluidos
   */
  static calculateDebtDetails(
    expenses: Expense[],
    splits: ExpenseSplit[],
    settlements: Settlement[],
    members: Member[]
  ): DebtDetail[] {
    // Mapa auxiliar para nombres
    const nameMap = new Map<string, string>()
    members.forEach(m => {
      nameMap.set(m.user_id, m.profiles?.full_name || m.user_id.slice(0, 8))
    })

    // Mapa de gastos para acceso rápido
    const expenseMap = new Map<string, Expense>()
    expenses.forEach(exp => expenseMap.set(exp.id, exp))

    // 1. Acumular deudas desde expense_splits
    // Estructura: Map<"deudor->acreedor", amount>
    const debtMatrix = new Map<string, number>()

    splits.forEach(split => {
      const expense = expenseMap.get(split.expense_id)
      if (!expense) return

      const debtor = split.user_id
      const creditor = expense.paid_by

      // El deudor le debe al pagador
      if (debtor !== creditor) {
        const key = `${debtor}->${creditor}`
        const current = debtMatrix.get(key) || 0
        debtMatrix.set(key, current + split.amount)
      }
    })

    // 2. Restar liquidaciones (settlements) de las deudas acumuladas
    settlements.forEach(settlement => {
      const key = `${settlement.from_user_id}->${settlement.to_user_id}`
      const current = debtMatrix.get(key) || 0
      debtMatrix.set(key, current - settlement.amount)
    })

    // 3. Convertir a array y filtrar montos insignificantes
    const details: DebtDetail[] = []
    debtMatrix.forEach((amount, key) => {
      if (Math.abs(amount) < 0.01) return // tolerancia de 1 centavo

      const [from_user_id, to_user_id] = key.split('->')
      details.push({
        from_user_id,
        to_user_id,
        amount: Math.round(amount * 100) / 100,
        debtor_name: nameMap.get(from_user_id) || from_user_id.slice(0, 8),
        creditor_name: nameMap.get(to_user_id) || to_user_id.slice(0, 8)
      })
    })

    // 4. Ordenar: primero los montos más altos
    details.sort((a, b) => b.amount - a.amount)

    return details
  }

  /**
   * Filtra deudas relevantes para un usuario específico
   * @param details - Detalles completos de deudas
   * @param userId - Usuario a filtrar
   * @returns Objeto con deudas que el usuario debe y deudas a su favor
   */
  static filterByUser(details: DebtDetail[], userId: string) {
    const iOwe = details.filter(d => d.from_user_id === userId && d.amount > 0)
    const oweMe = details.filter(d => d.to_user_id === userId && d.amount > 0)

    return { iOwe, oweMe }
  }
}
