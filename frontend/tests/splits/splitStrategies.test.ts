import { describe, it, expect } from 'vitest'
import { EqualSplitStrategy } from '../../lib/services/splits/EqualSplitStrategy'
import { FullSplitStrategy } from '../../lib/services/splits/FullSplitStrategy'
import { CustomSplitStrategy } from '../../lib/services/splits/CustomSplitStrategy'

const expenseId = 'exp-1'

describe('Split Strategies', () => {
  describe('EqualSplitStrategy', () => {
    it('splits amount equally excluding payer', () => {
      const strat = new EqualSplitStrategy()
      const splits = strat.build(expenseId, 90, 'u1', ['u1','u2','u3','u4'])
      // perPerson = 90 / 4 = 22.5; payer excluded, each non-payer owes 22.5
      expect(splits).toEqual([
        { expense_id: expenseId, user_id: 'u2', amount: 22.5 },
        { expense_id: expenseId, user_id: 'u3', amount: 22.5 },
        { expense_id: expenseId, user_id: 'u4', amount: 22.5 }
      ])
    })

    it('rounds to 2 decimals', () => {
      const strat = new EqualSplitStrategy()
      const splits = strat.build(expenseId, 100, 'u1', ['u1','u2','u3'])
      // perPerson = 100 / 3 = 33.333.. -> rounded to 33.33; payer excluded so only u2,u3 appear
      expect(splits).toEqual([
        { expense_id: expenseId, user_id: 'u2', amount: 33.33 },
        { expense_id: expenseId, user_id: 'u3', amount: 33.33 },
      ])
    })
  })

  describe('FullSplitStrategy', () => {
    it('assigns full amount to provided custom beneficiary', () => {
      const strat = new FullSplitStrategy()
      const splits = strat.build(expenseId, 55.5, 'u1', ['u1','u2','u3'], { u3: 55.5 })
      expect(splits).toEqual([
        { expense_id: expenseId, user_id: 'u3', amount: 55.5 }
      ])
    })

    it('falls back to first non-payer member when no custom provided', () => {
      const strat = new FullSplitStrategy()
      const splits = strat.build(expenseId, 40, 'u2', ['u1','u2','u3'])
      // first non-payer is u1
      expect(splits).toEqual([
        { expense_id: expenseId, user_id: 'u1', amount: 40 }
      ])
    })

    it('returns empty array if no other members', () => {
      const strat = new FullSplitStrategy()
      const splits = strat.build(expenseId, 10, 'only', ['only'])
      expect(splits).toEqual([])
    })
  })

  describe('CustomSplitStrategy', () => {
    it('creates splits for positive amounts excluding payer', () => {
      const strat = new CustomSplitStrategy()
      const splits = strat.build(expenseId, 0, 'u1', ['u1','u2','u3'], { u1: 999, u2: 12.345, u3: 7.1 })
      expect(splits).toEqual([
        { expense_id: expenseId, user_id: 'u2', amount: 12.35 },
        { expense_id: expenseId, user_id: 'u3', amount: 7.1 }
      ])
    })

    it('ignores zero or negative amounts', () => {
      const strat = new CustomSplitStrategy()
      const splits = strat.build(expenseId, 0, 'payer', ['payer','a','b','c'], { a: 0, b: -5, c: 3 })
      expect(splits).toEqual([
        { expense_id: expenseId, user_id: 'c', amount: 3 }
      ])
    })
  })
})
