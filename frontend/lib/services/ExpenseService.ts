import { supabase } from '../supabaseClient'
import type { Expense, ExpenseSplit, CreateExpenseData, UpdateExpenseData } from './types'
import { getSplitStrategy } from './splits'
import { createExpenseSchema, updateExpenseSchema, validateSchema } from '../validation/schemas'

/**
 * Service for handling expense-related operations
 * Single responsibility: CRUD for expenses and expense_splits
 */
export class ExpenseService {
  /**
   * Fetches all expenses for a group
   */
  static async getGroupExpenses(groupId: string): Promise<{ data: Expense[] | null; error: any }> {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id, description, amount, paid_by, created_at, created_by, updated_at, updated_by,
        profiles:paid_by ( full_name )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    return { data: data as any, error }
  }

  /**
   * Fetches all splits for a list of expenses
   */
  static async getExpenseSplits(expenseIds: string[]): Promise<{ data: ExpenseSplit[] | null; error: any }> {
    if (expenseIds.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('expense_splits')
      .select('*')
      .in('expense_id', expenseIds)

    return { data: data as any, error }
  }

  /**
   * Creates a new expense with its splits
   */
  static async createExpense(expenseData: CreateExpenseData): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validate with Zod
      const validation = validateSchema(createExpenseSchema, expenseData)
      if (!validation.success) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // 2. Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: validation.data.description,
          amount: validation.data.amount,
          paid_by: validation.data.paid_by,
          group_id: validation.data.group_id,
          created_by: validation.data.created_by
        })
        .select()
        .single()

      if (expenseError || !expense) {
        return { success: false, error: expenseError?.message || 'Failed to create expense' }
      }

      // 3. Compute splits using Strategy
      const strategy = getSplitStrategy(validation.data.splitType)
      const splits = strategy.build(
        expense.id,
        validation.data.amount,
        validation.data.paid_by,
        validation.data.memberIds,
        validation.data.splitType === 'full' && validation.data.fullBeneficiaryId
          ? { [validation.data.fullBeneficiaryId]: validation.data.amount }
          : validation.data.customSplits
      )

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)

      if (splitsError) {
        // Rollback: delete the expense if split creation fails
        await supabase.from('expenses').delete().eq('id', expense.id)
        return { success: false, error: 'Failed to create expense splits' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Updates an existing expense and its splits
   */
  static async updateExpense(
    expenseId: string,
    updateData: UpdateExpenseData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validate with Zod
      const validation = validateSchema(updateExpenseSchema, updateData)
      if (!validation.success) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // 2. Update the expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          description: validation.data.description,
          amount: validation.data.amount,
          paid_by: validation.data.paid_by,
          updated_by: validation.data.updated_by,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)

      if (expenseError) {
        return { success: false, error: expenseError.message }
      }

      // 3. Delete old splits
      await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId)

      // 4. Create new splits using Strategy
      const strategy = getSplitStrategy(validation.data.splitType)
      const splits = strategy.build(
        expenseId,
        validation.data.amount,
        validation.data.paid_by,
        validation.data.memberIds,
        validation.data.splitType === 'full' && validation.data.fullBeneficiaryId
          ? { [validation.data.fullBeneficiaryId]: validation.data.amount }
          : validation.data.customSplits
      )

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)

      if (splitsError) {
        return { success: false, error: 'Failed to update expense splits' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Deletes an expense and its splits
   */
  static async deleteExpense(expenseId: string): Promise<{ success: boolean; error?: string }> {
    // Splits are deleted automatically via CASCADE in the database
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}
