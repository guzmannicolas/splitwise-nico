export interface EmailPayload {
  invitedEmail: string
  invitedByName: string
  groupName: string
  token: string
  siteUrl: string
}

export interface EmailProviderResult {
  success: boolean
  data?: any
  error?: any
}

export interface EmailProvider {
  sendInvitation(payload: EmailPayload): Promise<EmailProviderResult>
}

// Implementación que usa Supabase Edge Function 'send-invitation-email'
import { supabase } from '../supabaseClient'

export class SupabaseEdgeEmailProvider implements EmailProvider {
  async sendInvitation(payload: EmailPayload): Promise<EmailProviderResult> {
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: payload,
      })
      if (error) {
        return { success: false, error, data }
      }
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err }
    }
  }
}
