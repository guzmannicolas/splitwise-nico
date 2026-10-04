import { GroupService } from './GroupService'
import { SupabaseEdgeEmailProvider } from './EmailProvider'
import { inviteSchema, validateSchema } from '../validation/schemas'

interface InvitationResult {
  ok: boolean
  message: string
  manualLink?: string
  emailSent?: boolean
}

export class InvitationService {
  private emailProvider = new SupabaseEdgeEmailProvider()

  async invite(groupId: string, email: string, invitedByUserId: string, siteUrl: string, inviterDisplayName?: string, groupName?: string): Promise<InvitationResult> {
    // 0. Validate with Zod
    const validation = validateSchema(inviteSchema, { email, group_id: groupId, invited_by: invitedByUserId })
    if (!validation.success) {
      return { ok: false, message: validation.errors.join(', ') }
    }

    // 1. Create invitation record in DB
    const { data: invitation, error } = await GroupService.inviteMember(groupId, validation.data.email, invitedByUserId)
    if (error) {
      return { ok: false, message: 'Failed to create invitation: ' + (error.message || 'Unknown') }
    }

    const token: string | undefined = invitation?.token
    if (!token) {
      return { ok: false, message: 'Invitation created without token. Check trigger/generation.' }
    }

    // 2. Build email payload
    const payload = {
      invitedEmail: email,
      invitedByName: inviterDisplayName || 'Someone',
      groupName: groupName || 'a group',
      token,
      siteUrl,
    }

    // 3. Send email
    const result = await this.emailProvider.sendInvitation(payload)
    if (!result.success) {
      const manualLink = `${siteUrl}/accept-invite?token=${token}`
      return { ok: true, message: 'Invitation created, but email delivery failed', manualLink, emailSent: false }
    }

    return { ok: true, message: 'Invitation sent successfully', emailSent: true }
  }
}
