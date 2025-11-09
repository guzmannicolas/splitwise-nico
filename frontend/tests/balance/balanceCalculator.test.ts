import { describe, it, expect } from 'vitest'
import { BalanceCalculator } from '../../lib/services/BalanceCalculator'
import type { Member, Expense, ExpenseSplit, Settlement } from '../../lib/services/types'

// Helper to build UUID-like ids (not validating format inside calculator)
const uid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`

describe('BalanceCalculator adjusted payer logic', () => {
  it('payer credited only with sum of splits, not full expense amount (equal split)', () => {
    const payer = uid(1)
    const u2 = uid(2)
    const u3 = uid(3)

    const members: Member[] = [
      { user_id: payer },
      { user_id: u2 },
      { user_id: u3 }
    ]

    const expenses: Expense[] = [
      {
        id: 'exp1',
        description: 'Test',
        amount: 9000,
        paid_by: payer,
        created_at: new Date().toISOString(),
        created_by: payer
      }
    ]

    // Equal strategy would have created splits only for non-payer members
    const splits: ExpenseSplit[] = [
      { expense_id: 'exp1', user_id: u2, amount: 3000 },
      { expense_id: 'exp1', user_id: u3, amount: 3000 }
    ]

    const settlements: Settlement[] = []

    const balances = BalanceCalculator.calculateBalances(members, expenses, splits, settlements)
    const map = Object.fromEntries(balances.map(b => [b.user_id, b.balance]))

    // Payer should have +6000 (sum of others), not +9000
    expect(map[payer]).toBe(6000)
    expect(map[u2]).toBe(-3000)
    expect(map[u3]).toBe(-3000)
    // Net zero check
    const net = balances.reduce((acc, b) => acc + b.balance, 0)
    expect(Math.abs(net)).toBeLessThan(0.001)
  })

  it('full split strategy: single debtor owes full amount, payer credited only that single split', () => {
    const payer = uid(1)
    const debtor = uid(2)
    const members: Member[] = [ { user_id: payer }, { user_id: debtor } ]
    const expenses: Expense[] = [ {
      id: 'e1', description: 'Full', amount: 500, paid_by: payer, created_at: new Date().toISOString(), created_by: payer
    } ]
    const splits: ExpenseSplit[] = [ { expense_id: 'e1', user_id: debtor, amount: 500 } ]
    const settlements: Settlement[] = []

    const balances = BalanceCalculator.calculateBalances(members, expenses, splits, settlements)
    const map = Object.fromEntries(balances.map(b => [b.user_id, b.balance]))

    expect(map[payer]).toBe(500)
    expect(map[debtor]).toBe(-500)
  })

  it('settlement reduces debt accordingly', () => {
    const payer = uid(1)
    const debtor = uid(2)
    const members: Member[] = [ { user_id: payer }, { user_id: debtor } ]
    const expenses: Expense[] = [ {
      id: 'e1', description: 'Full', amount: 500, paid_by: payer, created_at: new Date().toISOString(), created_by: payer
    } ]
    const splits: ExpenseSplit[] = [ { expense_id: 'e1', user_id: debtor, amount: 500 } ]
    const settlements: Settlement[] = [ { id: 's1', group_id: 'g', from_user_id: debtor, to_user_id: payer, amount: 200, created_at: new Date().toISOString() } ]

    const balances = BalanceCalculator.calculateBalances(members, expenses, splits, settlements)
    const map = Object.fromEntries(balances.map(b => [b.user_id, b.balance]))

    expect(map[payer]).toBe(300) // 500 owed - 200 received
    expect(map[debtor]).toBe(-300)
  })
})
