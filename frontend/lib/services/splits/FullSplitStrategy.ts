import { SplitStrategy, Split } from './types'

export class FullSplitStrategy implements SplitStrategy {
  build(expenseId: string, amount: number, paidBy: string, memberIds: string[]): Split[] {
    // Full al pagador: nadie debe nada -> retorna array vacío
    return []
  }
}
