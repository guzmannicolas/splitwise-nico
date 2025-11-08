import type { SplitType } from '../types'

export interface Split {
  expense_id: string
  user_id: string
  amount: number
}

export interface SplitStrategy {
  build(
    expenseId: string,
    amount: number,
    paidBy: string,
    memberIds: string[],
    custom?: Record<string, number>
  ): Split[]
}

export type SplitRegistry = Record<SplitType, SplitStrategy>
