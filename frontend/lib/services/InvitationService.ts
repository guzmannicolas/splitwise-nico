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
    // 0. Validar datos con Zod
    const validation = validateSchema(inviteSchema, { email, group_id: groupId, invited_by: invitedByUserId })
    if (!validation.success) {
      return { ok: false, message: validation.errors.join(', ') }
    }

    // 1. Crear registro de invitación en BD
    const { data: invitation, error } = await GroupService.inviteMember(groupId, validation.data.email, invitedByUserId)
    if (error) {
      return { ok: false, message: 'Error al crear invitación: ' + (error.message || 'Desconocido') }
    }

    const token: string | undefined = invitation?.token
    if (!token) {
      return { ok: false, message: 'Invitación creada sin token. Revisa trigger/generación.' }
    }

    // 2. Construir payload email
    const payload = {
      invitedEmail: email,
      invitedByName: inviterDisplayName || 'Alguien',
      groupName: groupName || 'un grupo',
      token,
      siteUrl,
    }

    // 3. Enviar email
    const result = await this.emailProvider.sendInvitation(payload)
    if (!result.success) {
      const manualLink = `${siteUrl}/accept-invite?token=${token}`
      return { ok: true, message: 'Invitación creada, pero fallo envío de email', manualLink, emailSent: false }
    }

    return { ok: true, message: 'Invitación enviada correctamente', emailSent: true }
  }
}
