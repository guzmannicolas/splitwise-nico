import { SplitStrategy, Split } from './types'

export class FullSplitStrategy implements SplitStrategy {
  build(
    expenseId: string,
    amount: number,
    paidBy: string,
    memberIds: string[],
    custom?: Record<string, number>
  ): Split[] {
    // Nueva lógica: un único deudor paga el 100% al pagador
    // Esperamos recibir en custom un objeto con { [beneficiaryUserId]: amount? }
    // Si no viene, por defecto tomamos el primer miembro distinto del pagador.
    let debtorId: string | undefined = undefined
    if (custom && Object.keys(custom).length > 0) {
      debtorId = Object.keys(custom)[0]
    }
    if (!debtorId) {
      debtorId = memberIds.find(uid => uid !== paidBy)
    }
    if (!debtorId) return []

    return [
      {
        expense_id: expenseId,
        user_id: debtorId,
        amount: parseFloat(amount.toFixed(2))
      }
    ]
  }
}
