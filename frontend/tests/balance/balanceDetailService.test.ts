import { describe, it, expect } from 'vitest'
import { BalanceDetailService } from '../../lib/services/BalanceDetailService'
import type { Expense, ExpenseSplit, Settlement, Member } from '../../lib/services/types'

const uid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`

describe('BalanceDetailService netting', () => {
  it('nets bilateral debts into a single direction', () => {
    const a = uid(1)
    const b = uid(2)
    const members: Member[] = [ { user_id: a, profiles: { full_name: 'A' } }, { user_id: b, profiles: { full_name: 'B' } } ]
    const expenses: Expense[] = [
      { id: 'e1', description: 'x', amount: 100, paid_by: a, created_at: new Date().toISOString(), created_by: a },
      { id: 'e2', description: 'y', amount: 60, paid_by: b, created_at: new Date().toISOString(), created_by: b },
    ]
    const splits: ExpenseSplit[] = [
      // b debe 100 a a
      { expense_id: 'e1', user_id: b, amount: 100 },
      // a debe 60 a b
      { expense_id: 'e2', user_id: a, amount: 60 },
    ]
    const settlements: Settlement[] = []

    const details = BalanceDetailService.calculateDebtDetails(expenses, splits, settlements, members)
    expect(details).toHaveLength(1)
    expect(details[0]).toMatchObject({ debtor_name: 'B', creditor_name: 'A', amount: 40 })
  })
})
