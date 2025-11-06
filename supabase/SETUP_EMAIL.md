# 📧 Configuración de Emails Automáticos con Edge Functions

## 📋 Requisitos Previos

1. **Cuenta en Resend** (gratuita): https://resend.com
   - 100 emails/día gratis
   - 3,000 emails/mes gratis
   - No requiere tarjeta de crédito

2. **Supabase CLI instalado**:
   ```bash
   npm install -g supabase
   ```

## 🚀 Paso a Paso

### 1. Configurar Resend

1. Crear cuenta en https://resend.com
2. Ir a **Dashboard** → **API Keys**
3. Click **Create API Key**
4. Copiar la key (empieza con `re_...`)

### 2. Verificar Dominio (Opcional pero recomendado)

**Para emails de producción:**
- Ir a **Domains** en Resend
- Agregar tu dominio `nicoguzmandev.com`
- Agregar los registros DNS que te indiquen (TXT, MX, CNAME)
- Verificar el dominio

**Para testing:**
- Puedes usar el dominio por defecto `onboarding.resend.dev`
- Los emails pueden caer en spam

### 3. Deploy de la Edge Function en Supabase

#### Opción A: Desde Supabase Dashboard (Recomendado)

1. **Ir a tu proyecto en Supabase**
2. **Edge Functions** (menú lateral)
3. **Create Function** → Nombre: `send-invitation-email`
4. Copiar el código de `supabase/functions/send-invitation-email/index.ts`
5. Pegar en el editor
6. **Deploy**

#### Opción B: Desde la Terminal (Requiere Supabase CLI)

```bash
# Login en Supabase
supabase login

# Vincular proyecto (reemplazar con tu project-id)
supabase link --project-ref your-project-ref

# Deploy de la función
supabase functions deploy send-invitation-email

# Configurar secret con tu API key de Resend
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui
```

### 4. Configurar Variables de Entorno

En **Supabase Dashboard**:
1. **Project Settings** → **Edge Functions**
2. **Secrets** → **Add new secret**
3. Nombre: `RESEND_API_KEY`
4. Valor: Tu API key de Resend (ej: `re_abc123...`)
5. **Save**

### 5. Habilitar la Función en el Proyecto

En **Supabase Dashboard**:
1. **Edge Functions** → `send-invitation-email`
2. Verificar que esté **Enabled**
3. Copiar la URL de la función (ej: `https://xxx.supabase.co/functions/v1/send-invitation-email`)

### 6. Probar la Función

En **Supabase Dashboard** → **Edge Functions** → `send-invitation-email`:

**Request body de prueba:**
```json
{
  "invitedEmail": "tu-email@example.com",
  "invitedByName": "Juan Pérez",
  "groupName": "Viaje a Bariloche",
  "token": "123e4567-e89b-12d3-a456-426614174000",
  "siteUrl": "http://localhost:3000"
}
```

Click **Invoke function** → Deberías recibir un email.

## 🧪 Probar en Local (Opcional)

Si instalaste Supabase CLI:

```bash
# Iniciar funciones localmente
supabase functions serve send-invitation-email --env-file supabase/.env.local

# En otro terminal, probar con curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-invitation-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "invitedEmail": "test@example.com",
    "invitedByName": "Test User",
    "groupName": "Test Group",
    "token": "test-token-123",
    "siteUrl": "http://localhost:3000"
  }'
```

## ✅ Verificar que Funciona

1. Ir a un grupo en tu app
2. Invitar a alguien por email
3. El invitado debería recibir un email con el botón "Aceptar Invitación"
4. Si falla, aparece un alert con el link para copiar manualmente

## 🎨 Personalizar el Email

Editar el HTML en `supabase/functions/send-invitation-email/index.ts`:

```typescript
html: `
  <!DOCTYPE html>
  <html>
    <!-- Aquí personaliza los estilos y contenido -->
  </html>
`
```

**Cambios recomendados:**
- Logo de tu app
- Colores de tu marca
- Footer con tus links (términos, privacidad, etc.)

## 🐛 Troubleshooting

### "Function not found"
- Verificar que la función esté deployada
- Revisar el nombre exacto: `send-invitation-email`

### "RESEND_API_KEY not set"
- Verificar que agregaste el secret en Supabase
- Redeployar la función después de agregar secrets

### Email no llega
- Revisar spam/correo no deseado
- Verificar que el dominio de Resend esté verificado
- Revisar logs en Resend Dashboard → Logs

### Email llega pero link no funciona
- Verificar que `siteUrl` sea correcto (http://localhost:3000 o tu dominio)
- Verificar que `/accept-invite` esté funcionando

## 💰 Límites Gratuitos

**Resend Free Tier:**
- 100 emails/día
- 3,000 emails/mes
- 1 dominio verificado

**Supabase Free Tier:**
- Edge Functions ilimitadas
- 2GB de transferencia/mes
- 500K invocaciones/mes

**Suficiente para:**
- Proyectos pequeños/medianos
- MVP y prototipos
- Apps con <100 usuarios activos

## 📈 Monitorear Uso

**Resend:**
- Dashboard → Activity → Ver emails enviados

**Supabase:**
- Edge Functions → send-invitation-email → Logs
- Ver errores, tiempo de ejecución, invocaciones

## 🔒 Seguridad

La función usa `security definer`, lo que significa:
- Se ejecuta con permisos de admin
- No expone tu API key de Resend al frontend
- Los usuarios no pueden abusar del servicio (RLS protege las invitaciones)

## 🎯 Mejoras Futuras

1. **Templates dinámicos**: Múltiples estilos de email
2. **Recordatorios**: Enviar email si no aceptan en 3 días
3. **Notificaciones**: Avisar cuando alguien acepta/rechaza
4. **Trackeo**: Saber si abrieron el email (Resend lo soporta)
5. **Attachments**: Incluir resumen del grupo en PDF

---

¿Dudas? Revisa:
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Resend Docs](https://resend.com/docs)
