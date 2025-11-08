import { SplitStrategy, Split } from './types'

export class EqualSplitStrategy implements SplitStrategy {
  build(expenseId: string, amount: number, paidBy: string, memberIds: string[]): Split[] {
    const perPerson = amount / memberIds.length
    return memberIds
      .filter(uid => uid !== paidBy)
      .map(uid => ({ expense_id: expenseId, user_id: uid, amount: parseFloat(perPerson.toFixed(2)) }))
  }
}
