# 🚀 Guía de Implementación - Mejoras de Seguridad

## 📋 Archivos Creados

### Migraciones SQL
1. **`migration_rate_limiting.sql`** - Rate limiting y prevención de spam
2. **`migration_token_invalidation.sql`** - Invalidación de tokens de invitación
3. **`migration_resource_limits.sql`** - Límites de recursos por usuario/grupo
4. **`test_security_limits.sql`** - Script de testing para verificar límites

---

## 🔧 Pasos de Implementación

### 1. Aplicar Migraciones en Supabase

#### Opción A: Via Dashboard (Recomendado)

1. Abrir **Supabase Dashboard** → tu proyecto
2. Ir a **SQL Editor** → **New Query**
3. Ejecutar los scripts en este orden:

```sql
-- Paso 1: Rate Limiting (EJECUTAR PRIMERO)
-- Pegar contenido de migration_rate_limiting.sql
-- Presionar Run

-- Paso 2: Token Invalidation (EJECUTAR SEGUNDO)
-- Pegar contenido de migration_token_invalidation.sql
-- Presionar Run

-- Paso 3: Resource Limits (EJECUTAR TERCERO)
-- Pegar contenido de migration_resource_limits.sql
-- Presionar Run
```

4. Verificar que no hay errores en la consola
5. Deberías ver mensajes de éxito como:
   ```
   ✔️ Rate limiting migration completed successfully!
   ✔️ Invitation token invalidation migration completed!
   ✔️ Resource limits migration completed successfully!
   ```

#### Opción B: Via CLI (Avanzado)

```bash
# Asegúrate de tener Supabase CLI instalado
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref <your-project-ref>

# Ejecutar migraciones
supabase db push --file supabase/migration_rate_limiting.sql
supabase db push --file supabase/migration_token_invalidation.sql
supabase db push --file supabase/migration_resource_limits.sql
```

---

### 2. Habilitar pg_cron (Requerido para auto-cleanup)

**Importante**: `pg_cron` es necesario para limpiar automáticamente los registros de `rate_limits` expirados.

#### En Supabase Dashboard:

1. Ir a **Database** → **Extensions**
2. Buscar `pg_cron`
3. Click en **Enable**
4. Esperar a que se active (puede tomar 1-2 minutos)

#### Verificar que se creó el job:

```sql
-- Ejecutar en SQL Editor
SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limits';
```

Deberías ver un registro con:
- `jobname`: `cleanup-rate-limits`
- `schedule`: `0 * * * *` (cada hora)
- `command`: `DELETE FROM rate_limits WHERE window_start < now() - interval '2 hours'`

---

### 3. Testing de Implementación

#### Opción A: Script Automatizado

```sql
-- Ejecutar test_security_limits.sql en SQL Editor
-- Este script:
-- 1. Crea un grupo de prueba
-- 2. Intenta crear 55 gastos (debería bloquearse en 50)
-- 3. Intenta agregar 15 invitados (debería bloquearse en 10)
-- 4. Intenta enviar 8 invitaciones (debería bloquearse en 5)
-- 5. Limpia los datos de prueba
```

**Resultado esperado:**
```
✔️ TEST 1: PASSED (50 expenses created, limit triggered)
✔️ TEST 2: PASSED (10 guests added, limit triggered)
✔️ TEST 3: PASSED (5 invitations sent, limit triggered)
```

#### Opción B: Testing Manual

1. **Rate Limiting de Gastos**:
   ```typescript
   // En tu app, intentar crear 51 gastos rápidamente
   for (let i = 0; i < 51; i++) {
     await supabase.from('expenses').insert({
       group_id: 'test-group-id',
       description: `Test ${i}`,
       amount: 100,
       paid_by: userId
     });
   }
   // El 51° debería fallar con error "Rate limit exceeded"
   ```

2. **Token de Invitación**:
   ```typescript
   // Crear invitación
   const { data: invitation } = await supabase
     .from('group_invitations')
     .insert({ group_id, invited_email: 'test@example.com' })
     .select()
     .single();
   
   // Aceptar invitación
   await supabase
     .from('group_invitations')
     .update({ status: 'accepted' })
     .eq('token', invitation.token);
   
   // Intentar aceptar de nuevo (debería fallar)
   await supabase
     .from('group_invitations')
     .update({ status: 'accepted' })
     .eq('token', invitation.token);
   // Error: "This invitation has already been used"
   ```

3. **Límite de Recursos**:
   ```sql
   -- Verificar límites actuales
   SELECT * FROM resource_usage_summary;
   
   -- Ver uso de un usuario específico
   SELECT * FROM user_group_usage WHERE user_id = '<user-id>';
   ```

---

### 4. Monitoreo Post-Implementación

#### Dashboard de Métricas

Crear queries guardadas en Supabase SQL Editor:

```sql
-- 1. Rate Limits Activos
SELECT 
  action,
  COUNT(*) as users_affected,
  AVG(attempts) as avg_attempts
FROM rate_limits
WHERE window_start > now() - interval '1 hour'
GROUP BY action;

-- 2. Usuarios Cerca del Límite de Grupos
SELECT * FROM user_group_usage 
WHERE group_count >= 45 
ORDER BY group_count DESC;

-- 3. Grupos Cerca del Límite de Miembros
SELECT * FROM group_member_usage 
WHERE status = 'WARNING' 
ORDER BY member_count DESC;

-- 4. Invitaciones Rechazadas por Límites (últimas 24h)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as failed_attempts
FROM rate_limits
WHERE action = 'send_invitation' 
  AND attempts >= 5
  AND created_at > now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### Alertas Recomendadas

Configurar alertas en Supabase Dashboard:

1. **Picos de Rate Limiting**:
   - Query: `SELECT COUNT(*) FROM rate_limits WHERE attempts >= max_limit`
   - Threshold: > 100 usuarios afectados en 1 hora
   - Acción: Email al admin

2. **Usuarios en Límite de Grupos**:
   - Query: `SELECT COUNT(*) FROM user_group_usage WHERE group_count >= 50`
   - Threshold: > 5 usuarios
   - Acción: Revisar si necesitas aumentar límite

3. **Errores de Database**:
   - Monitorear logs de Supabase para errores con "Rate limit exceeded"
   - Ajustar límites si hay muchos falsos positivos

---

### 5. Ajustar Límites (Si Es Necesario)

Si necesitas cambiar los límites después de implementar:

```sql
-- Cambiar límite de gastos de 50 a 100 por hora
CREATE OR REPLACE FUNCTION enforce_expense_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed boolean;
BEGIN
  v_allowed := check_rate_limit(
    auth.uid(),
    'create_expense',
    100,  -- <<<< CAMBIAR AQUÍ
    60
  );
  
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded: You can only create 100 expenses per hour. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Repetir para otros triggers según necesidad
```

---

### 6. Integración con Frontend

#### Mostrar Mensajes User-Friendly

```typescript
// lib/hooks/useExpenseOperations.ts
try {
  await supabase.from('expenses').insert(newExpense);
} catch (error: any) {
  // Detectar errores de rate limiting
  if (error.message?.includes('Rate limit exceeded')) {
    toast.error('Has creado muchos gastos recientemente. Intenta de nuevo en unos minutos.');
  } else if (error.message?.includes('maximum number of expenses')) {
    toast.error('Este grupo alcanzó el límite de 1000 gastos. Crea un nuevo grupo.');
  } else {
    toast.error('Error al crear gasto: ' + error.message);
  }
}
```

#### Prevenir Intentos Fallidos

```typescript
// Verificar límites antes de mostrar formulario
const { data: limits } = await supabase.rpc('can_add_to_group', {
  p_user_id: user.id,
  p_group_id: groupId
});

if (!limits.can_add_expense) {
  return (
    <Alert variant="warning">
      Este grupo alcanzó el límite de gastos ({limits.limits.group_expenses.current}/1000).
      Crea un nuevo grupo para continuar.
    </Alert>
  );
}
```

#### Mostrar Estado de Rate Limits

```typescript
// Componente en Dashboard para mostrar uso
function RateLimitStatus() {
  const [limits, setLimits] = useState(null);
  
  useEffect(() => {
    async function fetchLimits() {
      const { data } = await supabase
        .from('rate_limits')
        .select('action, attempts')
        .eq('user_id', user.id);
      setLimits(data);
    }
    fetchLimits();
  }, []);
  
  return (
    <div className="text-xs text-gray-500">
      {limits?.map(limit => (
        <div key={limit.action}>
          {limit.action}: {limit.attempts}/max intentos esta hora
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Checklist de Implementación

- [ ] Migración 1 (rate_limiting) aplicada sin errores
- [ ] Migración 2 (token_invalidation) aplicada sin errores
- [ ] Migración 3 (resource_limits) aplicada sin errores
- [ ] pg_cron habilitado y job creado
- [ ] Script de testing ejecutado con todos los tests PASSED
- [ ] Queries de monitoreo guardadas en Dashboard
- [ ] Frontend actualizado con manejo de errores de rate limiting
- [ ] Testing manual en staging/dev completado
- [ ] Documentación actualizada (SECURITY.md y ARCHITECTURE.md)
- [ ] Alertas configuradas para monitoreo

---

## 🐛 Troubleshooting

### Error: "extension pg_cron does not exist"

**Solución**: Habilitar manualmente en Supabase Dashboard → Database → Extensions

### Error: "rate_limits table does not exist"

**Solución**: Ejecutar `migration_rate_limiting.sql` primero (paso 1)

### Los límites no se activan

**Verificar**:
```sql
-- Ver triggers instalados
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname LIKE '%rate%';

-- Ver rate_limits actuales
SELECT * FROM rate_limits ORDER BY updated_at DESC LIMIT 10;
```

### pg_cron job no ejecuta

**Verificar**:
```sql
-- Ver jobs programados
SELECT * FROM cron.job;

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-rate-limits')
ORDER BY start_time DESC LIMIT 10;
```

---

## 📊 Impacto Esperado

### Antes de Implementar:
- ❌ Usuario puede crear gastos ilimitados instantáneamente
- ❌ Usuario puede agregar 1000+ invitados en segundos
- ❌ Tokens de invitación reutilizables indefinidamente
- ❌ Sin límites de crecimiento de DB

### Después de Implementar:
- ✅ Máximo 50 gastos/hora por usuario (configurable)
- ✅ Máximo 10 invitados/hora por usuario
- ✅ Máximo 5 invitaciones/hora por usuario
- ✅ Tokens de invitación usables una sola vez
- ✅ Límites de 50 grupos/usuario, 100 miembros/grupo, 1000 gastos/grupo
- ✅ Auto-limpieza de datos temporales cada hora

---

## 📈 Próximos Pasos (Opcionales)

1. **Monitoreo Avanzado**: Integrar con Sentry/Datadog para alertas en tiempo real
2. **Rate Limiting por IP**: Agregar límites adicionales por dirección IP (requiere Edge Functions)
3. **Captcha**: Agregar Google reCAPTCHA después de 3 intentos fallidos de login
4. **2FA**: Implementar autenticación de dos factores con Supabase MFA
5. **Auditoría Completa**: Tabla de audit_log para trackear todas las acciones críticas

---

**Última actualización**: Noviembre 2025  
**Tiempo estimado de implementación**: 30-45 minutos  
**Autor**: Proyecto Dividi2
