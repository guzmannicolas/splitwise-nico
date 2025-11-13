import { SplitStrategy, Split } from './types'

export class CustomSplitStrategy implements SplitStrategy {
  build(
    expenseId: string,
    _amount: number,
    paidBy: string,
    _memberIds: string[],
    custom: Record<string, number> = {}
  ): Split[] {
    return Object.entries(custom)
      .filter(([userId, amt]) => userId !== paidBy && amt > 0)
      .map(([userId, amt]) => ({ expense_id: expenseId, user_id: userId, amount: parseFloat(amt.toFixed(2)) }))
  }
}
