import { SplitStrategy, Split } from './types'

export class EachSplitStrategy implements SplitStrategy {
  build(expenseId: string, amount: number, paidBy: string, memberIds: string[]): Split[] {
    // En "cada uno paga su parte", cada persona paga exactamente su parte igual
    // Similar a equal, pero el concepto es que cada uno pagó su porción
    const perPerson = amount / memberIds.length
    return memberIds
      .filter(uid => uid !== paidBy)
      .map(uid => ({ 
        expense_id: expenseId, 
        user_id: uid, 
        amount: parseFloat(perPerson.toFixed(2)) 
      }))
  }
}
