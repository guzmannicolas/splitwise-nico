# Sistema de Invitaciones - Guía de Implementación

## ✅ Archivos Creados

1. **`supabase/migration_invitations.sql`**: Migración completa con tabla, funciones y RLS
2. **`frontend/pages/accept-invite.tsx`**: Página para aceptar/rechazar invitaciones
3. **`supabase/email_template_invitation.html`**: Template para emails (opcional)

## 📋 Pasos para Activar el Sistema

### 1. Aplicar Migración en Supabase

1. Ir a **Supabase Dashboard** → Tu proyecto
2. **SQL Editor** → **New Query**
3. Copiar y pegar todo el contenido de `supabase/migration_invitations.sql`
4. Click en **Run** o `Ctrl+Enter`
5. Verificar que no haya errores en la consola

### 2. Configurar URLs en Supabase Auth

1. **Authentication** → **URL Configuration**
2. **Site URL**: Agregar tu dominio de producción
   - Ejemplo: `https://dividi2.nicoguzmandev.com`
3. **Redirect URLs**: Agregar estas rutas:
   - `https://dividi2.nicoguzmandev.com/accept-invite`
   - `http://localhost:3000/accept-invite` (para desarrollo)

### 3. (Opcional) Configurar Email Automático

**Opción A: Usando Supabase Edge Functions**

Crear una función que escuche inserts en `group_invitations` y envíe emails:

```typescript
// supabase/functions/send-invitation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()
  
  // Enviar email usando SendGrid, Resend, o SMTP
  const inviteLink = `${Deno.env.get('SITE_URL')}/accept-invite?token=${record.token}`
  
  // Código para enviar email...
  
  return new Response('OK', { status: 200 })
})
```

**Opción B: Usando Webhooks**

1. Ir a **Database** → **Webhooks**
2. Crear webhook para tabla `group_invitations` en evento `INSERT`
3. Apuntar a tu servicio de emails (Zapier, Make, etc.)

**Opción C: Frontend con Servicio Externo**

Modificar `inviteMember()` en `frontend/pages/groups/[id].tsx` para llamar a API de email:

```typescript
// Después de crear la invitación
await fetch('/api/send-invitation-email', {
  method: 'POST',
  body: JSON.stringify({
    to: inviteEmail,
    inviteLink,
    groupName: group.name
  })
})
```

## 🧪 Cómo Probar

### Flujo Completo

1. **Crear Invitación**:
   - Ir a un grupo (`/groups/[id]`)
   - En sección "Miembros", ingresar email de alguien
   - Click "Invitar"
   - Se muestra un alert con el link de invitación
   - El link se copia automáticamente al portapapeles

2. **Aceptar Invitación** (como usuario invitado):
   - **Si NO estás logueado**:
     - Abrir link recibido
     - Aparece pantalla pidiendo login/registro
     - Crear cuenta o iniciar sesión
     - Automáticamente se procesa la invitación
     - Redirige al grupo
   
   - **Si YA estás logueado**:
     - Abrir link
     - Automáticamente se acepta
     - Redirige al grupo

3. **Verificar**:
   - En el grupo, el nuevo miembro debe aparecer en la lista
   - El nuevo miembro puede ver gastos y crear nuevos

### Casos de Error

- **Link expirado**: Muestra error "Invitación no válida o expirada"
- **Email no coincide**: "Esta invitación no es para tu email"
- **Ya es miembro**: "Ya eres miembro de este grupo"
- **Token inválido**: "Invitación no encontrada"

## 🔍 Verificar en Base de Datos

```sql
-- Ver invitaciones pendientes
SELECT * FROM group_invitations WHERE status = 'pending';

-- Ver invitaciones de un grupo específico
SELECT 
  gi.*,
  g.name as group_name,
  p.full_name as invited_by_name
FROM group_invitations gi
JOIN groups g ON gi.group_id = g.id
JOIN profiles p ON gi.invited_by = p.id
WHERE gi.group_id = 'tu-group-id';

-- Limpiar invitaciones expiradas manualmente
SELECT cleanup_expired_invitations();
```

## 🚀 Mejoras Futuras

1. **Notificaciones In-App**: Badge con número de invitaciones pendientes
2. **Página de Invitaciones**: Ver todas las invitaciones recibidas
3. **Recordatorios**: Enviar email si no aceptan en 3 días
4. **Invitaciones por Link Público**: Generar link reutilizable para unirse
5. **Límite de Invitaciones**: Prevenir spam con rate limiting
6. **Expiración Personalizable**: Permitir al invitador elegir duración

## 🐛 Troubleshooting

### Error: "permission denied for table group_invitations"
- Verificar que ejecutaste los `GRANT` al final de la migración
- Revisar RLS policies en Dashboard

### Link no funciona
- Verificar que el dominio esté en "Redirect URLs" de Supabase
- Revisar consola del navegador para errores CORS

### Email no se envía automáticamente
- Por ahora el sistema requiere copiar/pegar el link manualmente
- Implementar una de las opciones de email automation arriba

### Token expira muy rápido
- Por defecto expira en 7 días
- Modificar en migración: `expires_at timestamptz default (now() + interval '7 days')`

## 📚 Documentación Relacionada

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Next.js Dynamic Routes](https://nextjs.org/docs/routing/dynamic-routes)
