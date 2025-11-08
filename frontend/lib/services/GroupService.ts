import { supabase } from '../supabaseClient'
import type { Group, Member } from './types'

/**
 * Servicio para manejar operaciones relacionadas con grupos
 * Responsabilidad única: Interacción con la tabla 'groups' y 'group_members'
 */
export class GroupService {
  /**
   * Obtiene un grupo por ID
   */
  static async getGroupById(groupId: string): Promise<{ data: Group | null; error: any }> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    return { data, error }
  }

  /**
   * Obtiene todos los miembros de un grupo
   */
  static async getGroupMembers(groupId: string): Promise<{ data: Member[] | null; error: any }> {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        profiles:user_id ( full_name, email )
      `)
      .eq('group_id', groupId)

    return { data: data as any, error }
  }

  /**
   * Crea una invitación para un nuevo miembro
   */
  static async inviteMember(
    groupId: string,
    email: string,
    invitedBy: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        invited_email: email.toLowerCase().trim(),
        invited_by: invitedBy,
        status: 'pending'
      })
      .select()
      .single()

    return { data, error }
  }

  /**
   * Verifica si un usuario es miembro del grupo
   */
  static async isMember(groupId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    return !error && !!data
  }
}
