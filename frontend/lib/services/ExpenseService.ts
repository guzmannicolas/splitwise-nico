import { supabase } from '../supabaseClient'
import type { Expense, ExpenseSplit, CreateExpenseData, UpdateExpenseData } from './types'
import { getSplitStrategy } from './splits'

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
        id, description, amount, paid_by, created_at,
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
      // 1. Validar datos
      const validation = this.validateExpenseData(expenseData)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // 2. Crear el gasto
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: expenseData.description,
          amount: expenseData.amount,
          paid_by: expenseData.paid_by,
          group_id: expenseData.group_id
        })
        .select()
        .single()

      if (expenseError || !expense) {
        return { success: false, error: expenseError?.message || 'Error al crear el gasto' }
      }

      // 3. Calcular splits usando Strategy
      const strategy = getSplitStrategy(expenseData.splitType)
      const splits = strategy.build(
        expense.id,
        expenseData.amount,
        expenseData.paid_by,
        expenseData.memberIds,
        expenseData.customSplits
      )

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)

      if (splitsError) {
        // Rollback: eliminar el gasto si falla crear splits
        await supabase.from('expenses').delete().eq('id', expense.id)
        return { success: false, error: 'Error al crear la división del gasto' }
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
      // 1. Validar datos
      const validation = this.validateExpenseData({
        ...updateData,
        group_id: '', // No necesario para update
      })
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // 2. Actualizar el gasto
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          description: updateData.description,
          amount: updateData.amount,
          paid_by: updateData.paid_by
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
      const strategy = getSplitStrategy(updateData.splitType)
      const splits = strategy.build(
        expenseId,
        updateData.amount,
        updateData.paid_by,
        updateData.memberIds,
        updateData.customSplits
      )

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)

      if (splitsError) {
        return { success: false, error: 'Error al actualizar la división del gasto' }
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

  // Strategy pattern elimina necesidad de calculateSplits interno

  /**
   * Valida los datos de un gasto
   */
  private static validateExpenseData(data: CreateExpenseData): { valid: boolean; error?: string } {
    if (!data.description || data.description.trim().length === 0) {
      return { valid: false, error: 'La descripción es requerida' }
    }

    if (!data.amount || data.amount <= 0) {
      return { valid: false, error: 'El monto debe ser mayor a 0' }
    }

    if (!data.paid_by) {
      return { valid: false, error: 'Debes seleccionar quién pagó' }
    }

    if (!data.memberIds || data.memberIds.length === 0) {
      return { valid: false, error: 'El grupo debe tener al menos un miembro' }
    }

    // Validación para splits personalizados
    if (data.splitType === 'custom' && data.customSplits) {
      const total = Object.values(data.customSplits).reduce((sum, amt) => sum + amt, 0)
      const tolerance = 0.01 // Tolerancia de 1 centavo
      
      if (Math.abs(total - data.amount) > tolerance) {
        return { valid: false, error: `Los montos personalizados deben sumar ${data.amount.toFixed(2)}` }
      }
    }

    return { valid: true }
  }
}
