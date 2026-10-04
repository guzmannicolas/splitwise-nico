import { supabase } from '../supabaseClient'
import type { Group, Member } from './types'

/**
 * Service for handling group-related operations
 * Single responsibility: interaction with the 'groups' and 'group_members' tables
 */
export class GroupService {
  /**
   * Fetches a group by ID
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
   * Fetches all members of a group
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
   * Creates an invitation for a new member
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
   * Checks whether a user is a member of the group
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

  /**
   * Fetches all invitations for a group
   */
  static async getGroupInvitations(groupId: string): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('group_id', groupId)

    return { data, error }
  }
}
