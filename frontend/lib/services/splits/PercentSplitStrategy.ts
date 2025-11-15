import { SplitStrategy, Split } from './types'

export class PercentSplitStrategy implements SplitStrategy {
  build(expenseId: string, amount: number, paidBy: string, memberIds: string[], customSplits?: Record<string, number>): Split[] {
    if (!customSplits) {
      throw new Error('PercentSplitStrategy requires customSplits with percentages')
    }

    return memberIds
      .filter(uid => uid !== paidBy)
      .map(uid => {
        const percentage = customSplits[uid] || 0
        const userAmount = (amount * percentage) / 100
        return { 
          expense_id: expenseId, 
          user_id: uid, 
          amount: parseFloat(userAmount.toFixed(2)) 
        }
      })
      .filter(split => split.amount > 0)
  }
}
