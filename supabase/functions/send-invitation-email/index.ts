// Edge Function para enviar emails de invitación usando Resend
// Documentación: https://supabase.com/docs/guides/functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailPayload {
  invitedEmail: string
  invitedByName: string
  groupName: string
  token: string
  siteUrl: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obtener datos del request
    const payload: EmailPayload = await req.json()
    const { invitedEmail, invitedByName, groupName, token, siteUrl } = payload

    // Validar datos
    if (!invitedEmail || !token || !siteUrl) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Construir link de invitación
    const inviteLink = `${siteUrl}/accept-invite?token=${token}`

    // Enviar email con Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Dividi2 <noreply@nicoguzmandev.com>', // Tu dominio verificado
        to: [invitedEmail],
        subject: '¡Te han invitado a un grupo en Dividi2!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                .link { color: #3b82f6; word-break: break-all; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💸 Dividi2</h1>
                </div>
                <div class="content">
                  <h2>¡Te han invitado a un grupo!</h2>
                  <p>Hola,</p>
                  <p><strong>${invitedByName || 'Alguien'}</strong> te ha invitado a unirte al grupo <strong>${groupName || 'un grupo'}</strong> en Dividi2.</p>
                  <p>Con Dividi2 puedes dividir gastos fácilmente con tus amigos, compañeros de piso o compañeros de viaje.</p>
                  <p style="text-align: center;">
                    <a href="${inviteLink}" class="button">Aceptar Invitación</a>
                  </p>
                  <p>O copia y pega este enlace en tu navegador:</p>
                  <p class="link">${inviteLink}</p>
                  <p style="color: #6b7280; font-size: 14px;">Esta invitación expira en 7 días.</p>
                </div>
                <div class="footer">
                  <p>Si no esperabas este email, puedes ignorarlo.</p>
                  <p>© 2025 Dividi2 - Splitwise Clone</p>
                </div>
              </div>
            </body>
          </html>
        `
      })
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Error de Resend:', data)
      throw new Error(data.message || 'Error al enviar email')
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email enviado',
      emailId: data.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error en send-invitation-email:', error)
    return new Response(JSON.stringify({ 
      error: error?.message || 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
