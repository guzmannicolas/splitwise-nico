# 🔒 Guía de Seguridad - Dividi2

## 📋 Análisis de Amenazas y Mitigaciones

Esta guía documenta las medidas de seguridad implementadas y pendientes para proteger la aplicación contra ataques comunes.

---

## 🛡️ Protecciones Actuales Implementadas

### 1. SQL Injection

**✅ PROTEGIDO**

**Amenaza**: Inyección de código SQL malicioso a través de inputs de usuario.

**Mitigación Implementada**:
- **Supabase Client**: Usa **prepared statements** automáticamente en todas las queries
- No se concatenan strings para construir SQL
- Todos los parámetros se sanitizan antes de llegar a la DB

**Ejemplo Seguro**:
```typescript
// ✅ SEGURO: Supabase sanitiza automáticamente
const { data } = await supabase
  .from('groups')
  .select('*')
  .eq('name', userInput);  // userInput es escapado automáticamente

// ❌ INSEGURO (NO SE USA EN EL PROYECTO):
// const query = `SELECT * FROM groups WHERE name = '${userInput}'`;
```

**Recomendaciones**:
- ✅ **No cambiar**: Mantener uso exclusivo de Supabase Client
- ✅ **Validar inputs**: Aunque Supabase protege, validar tipos y formatos en frontend (ya implementado con formularios controlados)

---

### 2. Row Level Security (RLS)

**✅ PROTEGIDO**

**Amenaza**: Usuarios accediendo/modificando datos de otros usuarios.

**Mitigación Implementada**:
- **RLS habilitado** en todas las tablas críticas
- Políticas que verifican `auth.uid()` en cada operación
- Solo miembros de un grupo pueden ver/editar sus datos

**Políticas Clave**:
```sql
-- Usuarios solo ven grupos donde son miembros
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM group_members WHERE group_id = id
  ));

-- Solo miembros pueden crear gastos en su grupo
CREATE POLICY "Members can create expenses in their groups"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM group_members WHERE group_id = expenses.group_id
  ));
```

**Recomendaciones**:
- ✅ **Mantener RLS habilitado**: NUNCA desactivar para "facilitar desarrollo"
- ✅ **Testear políticas**: Verificar con múltiples usuarios que no se cruzan datos

---

### 3. Autenticación y Sesiones

**✅ PARCIALMENTE PROTEGIDO**

**Amenaza**: Acceso no autorizado, robo de sesiones, fuerza bruta.

**Mitigación Implementada**:
- **Supabase Auth**: Maneja tokens JWT seguros
- **bcrypt**: Contraseñas hasheadas (gestionado por Supabase)
- **Email confirmation**: Verificación de email obligatoria
- **Sesiones con expiración**: Tokens con TTL configurables

**Vulnerabilidades Identificadas**:
- ⚠️ **Sin rate limiting**: No hay límite de intentos de login
- ⚠️ **Sin 2FA**: Autenticación de dos factores no implementada
- ⚠️ **Contraseñas débiles permitidas**: Sin política de complejidad mínima

---

## ⚠️ Amenazas Críticas Sin Mitigar

### 4. Rate Limiting y DoS

**❌ VULNERABLE**

**Amenaza**: Usuarios maliciosos pueden:
- Crear **infinidad de usuarios invitados** en un grupo
- Crear **miles de gastos** para llenar la base de datos
- Hacer **spam de invitaciones** por email
- **Fuerza bruta** en login sin límite de intentos

**Impacto**:
- 💰 **Costos elevados**: Supabase cobra por almacenamiento y requests
- 🐌 **Degradación del servicio**: DB lenta para todos los usuarios
- 📧 **Bloqueo de emails**: Supabase puede suspender servicio de email por spam

**Mitigaciones Recomendadas**:

#### A. Rate Limiting en Backend (Supabase Edge Functions)

Implementar middleware de rate limiting:

```typescript
// supabase/functions/rate-limiter/index.ts
import { createClient } from '@supabase/supabase-js';

const LIMITS = {
  create_guest: { max: 10, window: '1 hour' },
  create_expense: { max: 50, window: '1 hour' },
  send_invitation: { max: 5, window: '1 hour' },
  login_attempt: { max: 5, window: '15 minutes' }
};

export async function checkRateLimit(userId: string, action: string) {
  // Consultar tabla rate_limits (crear nueva tabla)
  const { data } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('user_id', userId)
    .eq('action', action)
    .single();

  // Verificar si excede límite
  if (data && data.attempts >= LIMITS[action].max) {
    const elapsed = Date.now() - new Date(data.window_start).getTime();
    if (elapsed < parseWindow(LIMITS[action].window)) {
      throw new Error('Rate limit exceeded. Try again later.');
    }
  }

  // Incrementar contador
  await supabase.from('rate_limits').upsert({
    user_id: userId,
    action: action,
    attempts: (data?.attempts || 0) + 1,
    window_start: data?.window_start || new Date()
  });
}
```

#### B. Tabla de Rate Limits en DB

```sql
CREATE TABLE rate_limits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  attempts integer DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action)
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action);

-- Cleanup automático de ventanas expiradas (ejecutar con pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', $$
  DELETE FROM rate_limits WHERE window_start < now() - interval '2 hours'
$$);
```

#### C. Límites de Recursos por Usuario

```sql
-- Agregar constraints a nivel de DB
ALTER TABLE group_members 
  ADD CONSTRAINT max_members_per_group 
  CHECK (
    (SELECT COUNT(*) FROM group_members WHERE group_id = group_members.group_id) <= 100
  );

-- Función para verificar límite de grupos por usuario
CREATE OR REPLACE FUNCTION check_user_group_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM group_members WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'User has reached maximum number of groups (50)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_user_group_limit
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION check_user_group_limit();
```

#### D. Rate Limiting en Frontend (UI)

```typescript
// frontend/lib/hooks/useRateLimit.ts
export function useRateLimit(action: string, maxAttempts: number, windowMs: number) {
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);

  const checkLimit = () => {
    if (blockedUntil && Date.now() < blockedUntil.getTime()) {
      return false; // Bloqueado
    }
    return true;
  };

  const increment = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= maxAttempts) {
      setBlockedUntil(new Date(Date.now() + windowMs));
      setTimeout(() => {
        setAttempts(0);
        setBlockedUntil(null);
      }, windowMs);
    }
  };

  return { checkLimit, increment, blockedUntil };
}

// Uso en componente:
const { checkLimit, increment, blockedUntil } = useRateLimit('create_expense', 10, 60000);

const handleSubmit = async () => {
  if (!checkLimit()) {
    alert(`Rate limit exceeded. Try again in ${Math.ceil((blockedUntil!.getTime() - Date.now()) / 1000)}s`);
    return;
  }
  increment();
  // ... resto del código
};
```

---

### 5. XSS (Cross-Site Scripting)

**✅ MAYORMENTE PROTEGIDO**

**Amenaza**: Inyección de JavaScript malicioso en inputs que se renderizan en el DOM.

**Mitigación Implementada**:
- **React**: Escapa automáticamente contenido renderizado con `{variable}`
- **No uso de `dangerouslySetInnerHTML`** en el código actual

**Vulnerabilidades Potenciales**:
- ⚠️ Nombres de grupos/gastos con HTML/JS: React los escapa, pero validar en backend
- ⚠️ Emails en invitaciones: Validar formato para evitar payloads

**Recomendaciones**:
```typescript
// Validar inputs en backend antes de guardar
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// O usar librería DOMPurify para sanitización robusta
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userInput);
```

---

### 6. CSRF (Cross-Site Request Forgery)

**✅ PROTEGIDO**

**Amenaza**: Sitios maliciosos haciendo requests a tu API con la sesión del usuario.

**Mitigación Implementada**:
- **Supabase Auth**: Usa tokens JWT en headers (no cookies vulnerables a CSRF)
- **SameSite cookies**: Supabase configura cookies con `SameSite=Lax`

**Recomendaciones**:
- ✅ Mantener autenticación basada en headers JWT
- ✅ No implementar autenticación con cookies de sesión tradicionales

---

### 7. Exposición de Datos Sensibles

**⚠️ RIESGO MEDIO**

**Amenaza**: Información sensible expuesta en logs, errores, o código cliente.

**Vulnerabilidades Identificadas**:
- ⚠️ **API Keys en frontend**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` es pública (esperado, pero limitada por RLS)
- ⚠️ **Errores verbose**: Algunos `error.message` muestran detalles de DB
- ⚠️ **Emails visibles**: Miembros de un grupo ven emails de otros (feature o bug?)

**Mitigaciones Recomendadas**:

```typescript
// Sanitizar errores antes de mostrar al usuario
function sanitizeError(error: any): string {
  if (process.env.NODE_ENV === 'production') {
    // No exponer detalles técnicos en producción
    return 'An error occurred. Please try again.';
  }
  return error.message || 'Unknown error';
}

// Usar variables de entorno para secrets
// .env.local (NUNCA commitear)
SUPABASE_SERVICE_ROLE_KEY=secret  // Solo en backend
NEXT_PUBLIC_SUPABASE_ANON_KEY=public  // OK en frontend (limitada por RLS)
```

---

### 8. Invitaciones y Tokens

**⚠️ RIESGO MEDIO**

**Amenaza**: Tokens de invitación predecibles o reutilizables.

**Implementación Actual**:
```sql
-- Token generado con gen_random_uuid() (seguro)
token uuid DEFAULT gen_random_uuid()
expires_at timestamptz DEFAULT (now() + interval '7 days')
```

**Vulnerabilidades Potenciales**:
- ⚠️ Tokens no se invalidan después de usarse (pueden reutilizarse múltiples veces antes de expirar)
- ⚠️ Sin límite de invitaciones por grupo (spam)

**Mitigaciones Recomendadas**:

```sql
-- Invalidar token al aceptar invitación
UPDATE group_invitations 
SET status = 'accepted', used_at = now()
WHERE token = $1 AND status = 'pending';

-- Agregar trigger para verificar que token no fue usado
CREATE OR REPLACE FUNCTION check_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'accepted' THEN
    RAISE EXCEPTION 'Invitation already used';
  END IF;
  IF NEW.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invitation_token
  BEFORE UPDATE ON group_invitations
  FOR EACH ROW EXECUTE FUNCTION check_invitation_token();
```

---

## 🚨 Plan de Acción Priorizado

### Prioridad 1 - CRÍTICO (Implementar en < 1 semana)

1. **Rate Limiting en Creación de Recursos**
   - [ ] Crear tabla `rate_limits`
   - [ ] Limitar creación de invitados: 10/hora por usuario
   - [ ] Limitar creación de gastos: 50/hora por grupo
   - [ ] Limitar invitaciones por email: 5/hora por usuario

2. **Invalidación de Tokens de Invitación**
   - [ ] Agregar campo `used_at` a `group_invitations`
   - [ ] Trigger para verificar que token no fue usado previamente
   - [ ] Verificar expiración en endpoint de aceptación

3. **Límites de Recursos por Usuario**
   - [ ] Máximo 50 grupos por usuario
   - [ ] Máximo 100 miembros por grupo
   - [ ] Máximo 1000 gastos por grupo

### Prioridad 2 - ALTO (Implementar en < 1 mes)

4. **Rate Limiting en Autenticación**
   - [ ] Limitar intentos de login: 5 intentos/15 minutos
   - [ ] Limitar registros: 3 cuentas/día por IP
   - [ ] Implementar CAPTCHA después de 3 intentos fallidos

5. **Validación de Inputs Mejorada**
   - [ ] Instalar `zod` o `yup` para validación de schemas
   - [ ] Validar todos los inputs en backend antes de INSERT
   - [ ] Sanitizar strings con DOMPurify

6. **Monitoreo y Alertas**
   - [ ] Configurar Supabase Monitoring para detectar picos de requests
   - [ ] Alertas por email si se exceden 10,000 requests/hora
   - [ ] Dashboard de métricas de uso por usuario

### Prioridad 3 - MEDIO (Implementar en < 3 meses)

7. **Autenticación de Dos Factores (2FA)**
   - [ ] Integrar Supabase MFA (TOTP)
   - [ ] UI para configurar 2FA en perfil
   - [ ] Hacer 2FA obligatorio para admins de grupos grandes

8. **Política de Contraseñas Robustas**
   - [ ] Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 símbolo
   - [ ] Verificar contra lista de contraseñas comunes (haveibeenpwned API)
   - [ ] Forzar cambio de contraseña cada 90 días (opcional)

9. **Auditoría de Acciones Críticas**
   - [ ] Tabla `audit_log` para registrar cambios en gastos/settlements
   - [ ] Registrar quién borró/editó un gasto (ya hay `created_at`, falta `updated_by`)
   - [ ] UI para ver historial de cambios en grupo

### Prioridad 4 - BAJO (Mejoras futuras)

10. **Encriptación de Datos Sensibles**
    - [ ] Encriptar descripciones de gastos en DB (pgcrypto)
    - [ ] Encriptación E2E para mensajes entre miembros (futuro)

11. **Protección contra Scraping**
    - [ ] Implementar CAPTCHA en endpoints públicos
    - [ ] Ofuscar IDs de recursos (usar UUIDs opacos)

12. **Content Security Policy (CSP)**
    - [ ] Configurar headers CSP en Next.js
    - [ ] Bloquear ejecución de scripts inline

---

## 📊 Costos de Implementación

| Tarea | Tiempo Estimado | Complejidad |
|-------|----------------|-------------|
| Tabla rate_limits + triggers | 2-3 horas | Baja |
| Rate limiting en Edge Functions | 4-6 horas | Media |
| Invalidación de tokens | 1-2 horas | Baja |
| Límites de recursos | 2-3 horas | Baja |
| Rate limiting en auth | 3-4 horas | Media |
| Validación con Zod | 4-6 horas | Media |
| Monitoreo y alertas | 2-3 horas | Baja |
| 2FA | 8-12 horas | Alta |
| Auditoría de acciones | 6-8 horas | Media |
| **TOTAL (Prioridades 1-2)** | **20-30 horas** | - |

---

## 🧪 Testing de Seguridad

### Pruebas Manuales

1. **SQL Injection**:
   ```
   Input: `'; DROP TABLE groups; --`
   Verificar: Supabase escapa correctamente
   ```

2. **Rate Limiting**:
   ```
   Script para crear 100 gastos en 1 minuto
   Verificar: Se bloquea después del límite
   ```

3. **RLS Bypass**:
   ```
   Usuario A intenta acceder a grupo de Usuario B
   Verificar: Query devuelve vacío
   ```

### Herramientas Recomendadas

- **OWASP ZAP**: Escaneo automático de vulnerabilidades
- **Burp Suite**: Testing manual de API
- **npm audit**: Detectar vulnerabilidades en dependencias
- **Supabase Database Advisor**: Análisis de performance y seguridad

---

## 📚 Recursos Adicionales

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Rate Limiting Patterns](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

**Última actualización**: Noviembre 2025  
**Autor**: Proyecto Dividi2  
**Revisión**: Pendiente de implementación
