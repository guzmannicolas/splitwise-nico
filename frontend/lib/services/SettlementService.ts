import { supabase } from '../supabaseClient'
import type { Settlement } from './types'

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
    if (amount <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0' }
    }

    if (fromUserId === toUserId) {
      return { success: false, error: 'No puedes liquidar contigo mismo' }
    }

    const { error } = await supabase
      .from('settlements')
      .insert({
        group_id: groupId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}
