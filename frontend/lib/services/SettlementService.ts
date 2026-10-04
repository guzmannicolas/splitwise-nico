import { supabase } from '../supabaseClient'
import type { Settlement } from './types'
import { createSettlementSchema, validateSchema } from '../validation/schemas'

/**
 * Service for managing debt settlements
 * Single responsibility: CRUD for settlements
 */
export class SettlementService {
  /**
   * Gets all settlements for a group
   */
  static async getGroupSettlements(groupId: string): Promise<{ data: Settlement[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      return { data: data as any, error }
    } catch (error) {
      console.warn('The settlements table does not exist or there is an error:', error)
      return { data: [], error: null }
    }
  }

  /**
   * Creates a new settlement
   */
  static async createSettlement(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    // Validate with Zod
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
   * Deletes a settlement (hard DELETE)
   */
  static async deleteSettlement(settlementId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('id', settlementId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}
