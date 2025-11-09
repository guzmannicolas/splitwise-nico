import { supabase } from '../supabaseClient'
import type { Settlement } from './types'
import { createSettlementSchema, validateSchema } from '../validation/schemas'

/**
 * Servicio para manejar liquidaciones de deudas
 * Responsabilidad única: CRUD de settlements
 */
export class SettlementService {
  /**
   * Obtiene todas las liquidaciones de un grupo
   */
  static async getGroupSettlements(groupId: string): Promise<{ data: Settlement[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      return { data: data as any, error }
    } catch (error) {
      console.warn('La tabla settlements no existe o hay un error:', error)
      return { data: [], error: null }
    }
  }

  /**
   * Crea una nueva liquidación
   */
  static async createSettlement(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    // Validar con Zod
    const validation = validateSchema(createSettlementSchema, {
      group_id: groupId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount
    })

    if (!validation.success) {
      return { success: false, error: validation.errors.join(', ') }
    }

    const { error } = await supabase
      .from('settlements')
      .insert({
        group_id: validation.data.group_id,
        from_user_id: validation.data.from_user_id,
        to_user_id: validation.data.to_user_id,
        amount: validation.data.amount
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Elimina una liquidación
   */
  static async deleteSettlement(settlementId: string): Promise<{ success: boolean; error?: string }> {
    // Soft delete: set deleted_at, row remains for auditing
    const { error } = await supabase
      .from('settlements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', settlementId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}
