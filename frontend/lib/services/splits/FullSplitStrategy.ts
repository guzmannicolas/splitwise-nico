import { SplitStrategy, Split } from './types'

export class FullSplitStrategy implements SplitStrategy {
  build(
    expenseId: string,
    amount: number,
    paidBy: string,
    memberIds: string[],
    custom?: Record<string, number>
  ): Split[] {
    // One debtor owes 100% to the payer.
    // `custom` should be { [beneficiaryUserId]: amount? } when provided.
    // If absent, default to the first member who is not the payer.
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
