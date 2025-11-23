import { supabase } from '../supabaseClient'
import type { Expense, ExpenseSplit, CreateExpenseData, UpdateExpenseData } from './types'
import { getSplitStrategy } from './splits'
import { createExpenseSchema, updateExpenseSchema, validateSchema } from '../validation/schemas'

/**
 * Servicio para manejar operaciones relacionadas con gastos
 * Responsabilidad única: CRUD de expenses y expense_splits
 */
export class ExpenseService {
  /**
   * Obtiene todos los gastos de un grupo
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
   * Obtiene todos los splits de una lista de gastos
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
   * Crea un nuevo gasto con sus splits
   */
  static async createExpense(expenseData: CreateExpenseData): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validar datos con Zod
      const validation = validateSchema(createExpenseSchema, expenseData)
      if (!validation.success) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // 2. Crear el gasto
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
        return { success: false, error: expenseError?.message || 'Error al crear el gasto' }
      }

      // 3. Calcular splits usando Strategy
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
        // Rollback: eliminar el gasto si falla crear splits
        await supabase.from('expenses').delete().eq('id', expense.id)
        return { success: false, error: 'Error al crear la división del gasto' }
      }

      // Fire-and-forget: notify group members via server endpoint
      try {
        void fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            group_id: expense.group_id,
            title: 'Nuevo gasto',
            body: `${expense.description} — $${expense.amount}`,
            url: `/groups/${expense.group_id}`
          })
        })
      } catch (err) {
        // don't block on notification failures
        console.error('Failed to call push send endpoint', err)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
    }
  }

  /**
   * Actualiza un gasto existente y sus splits
   */
  static async updateExpense(
    expenseId: string,
    updateData: UpdateExpenseData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validar datos con Zod
      const validation = validateSchema(updateExpenseSchema, updateData)
      if (!validation.success) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // 2. Actualizar el gasto
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

      // 3. Eliminar splits antiguos
      await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId)

      // 4. Crear nuevos splits usando Strategy
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
        return { success: false, error: 'Error al actualizar la división del gasto' }
      }

      // Notify group members about the update (fire-and-forget)
      try {
        // Fetch the expense to retrieve the `group_id` and current fields
        const { data: updatedExpense, error: fetchExpenseError } = await supabase
          .from('expenses')
          .select('group_id, description, amount')
          .eq('id', expenseId)
          .single()

        if (fetchExpenseError || !updatedExpense) {
          // If we can't fetch the expense, don't attempt to send push notifications
          console.warn('Could not fetch updated expense for notifications', fetchExpenseError)
        } else {
          void fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              group_id: updatedExpense.group_id,
              title: 'Gasto actualizado',
              body: `${updatedExpense.description} — $${updatedExpense.amount}`,
              url: `/groups/${updatedExpense.group_id}`
            })
          })
        }
      } catch (err) {
        console.error('Failed to call push send endpoint', err)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
    }
  }

  /**
   * Elimina un gasto y sus splits
   */
  static async deleteExpense(expenseId: string): Promise<{ success: boolean; error?: string }> {
    // Los splits se eliminan automáticamente por CASCADE en la BD
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
