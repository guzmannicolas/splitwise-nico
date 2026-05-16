# Push Notifications — Arquitectura y Flujo Completo

## Índice

1. [¿Qué tecnologías están involucradas?](#tecnologías)
2. [Flujo completo de una notificación](#flujo-completo)
3. [Componentes del sistema](#componentes)
4. [Base de datos](#base-de-datos)
5. [Edge Function — send-push-notification](#edge-function)
6. [Service Worker](#service-worker)
7. [Hook del cliente — usePushNotifications](#hook-del-cliente)
8. [NotificationService](#notificationservice)
9. [Bugs que tuvimos y cómo los resolvimos](#bugs-resueltos)
10. [Cómo probar desde cero](#cómo-probar)

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | Next.js 13 + React 18 + TypeScript |
| Backend serverless | Supabase Edge Functions (Deno) |
| Base de datos | Supabase PostgreSQL con RLS |
| Push protocol | Web Push Protocol (RFC 8291 + RFC 8292) |
| Cifrado payload | AES-128-GCM |
| Auth del servidor push | VAPID (JWT firmado con ECDSA P-256) |
| Service Worker | `frontend/public/sw.js` |
| Push relay externo | FCM (Firebase Cloud Messaging) para Chrome/Android |

---

## Flujo Completo

```
SUSCRIPCIÓN (una vez por dispositivo):
──────────────────────────────────────
Browser                     Supabase DB
  │                              │
  │── Pide permiso al usuario ──▶│
  │◀── "granted" ───────────────│
  │                              │
  │── navigator.serviceWorker    │
  │   .ready.pushManager         │
  │   .subscribe(vapidPublicKey) │
  │◀── PushSubscription ─────────│  (endpoint FCM + p256dh + auth)
  │                              │
  │── supabase.from('push_subscriptions').upsert(...) ──▶ DB
  │                              │
  ✓ La suscripción queda guardada por dispositivo


ENVÍO DE NOTIFICACIÓN (cada vez que ocurre un evento):
───────────────────────────────────────────────────────
Frontend (browser)          Edge Function              FCM/APNS          Dispositivo
  │                              │                        │                  │
  │── supabase.functions         │                        │                  │
  │   .invoke('send-push...',    │                        │                  │
  │   { groupId, payload })────▶ │                        │                  │
  │                              │── Busca suscripciones  │                  │
  │                              │   del grupo en DB ─────│                  │
  │                              │                        │                  │
  │                              │── Cifra payload (AES-128-GCM)            │
  │                              │── Firma VAPID JWT (ECDSA P-256)          │
  │                              │── POST al endpoint FCM ──────▶           │
  │                              │                        │── Push ─────────▶│
  │                              │◀── 201 Created ────────│                  │
  │◀── { sent: 1 } ─────────────│                        │                  │
  │                              │                        │   SW recibe 'push'│
  │                              │                        │   showNotification│
```

---

## Componentes

### 1. VAPID Keys (Variable Access Identifier)

Son un par de claves ECDSA P-256. Identifican al servidor ante los push services (FCM, etc.) sin necesidad de una API key centralizada.

```
VAPID_PUBLIC_KEY  → guardada en Vercel env + en sw.js (hardcodeada)
VAPID_PRIVATE_KEY → guardada SOLO en Supabase Edge Function secrets
NEXT_PUBLIC_VAPID_PUBLIC_KEY → usada en el frontend para suscribirse
```

Se generan una sola vez con `web-push` o `openssl`. **Si las rotás, todas las suscripciones existentes quedan inválidas** porque el navegador valida la key al suscribirse.

### 2. PushSubscription

Cuando el usuario acepta las notificaciones, el browser genera:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/ABC123...",
  "keys": {
    "p256dh": "base64url de la clave pública del cliente (65 bytes, ECDH P-256)",
    "auth":   "base64url de un secreto de 16 bytes"
  }
}
```

- **endpoint**: la URL del push service (FCM para Chrome/Android, APNS para Safari/iOS)
- **p256dh**: clave pública del browser para cifrar el payload
- **auth**: secreto compartido para el HKDF

### 3. Cifrado del payload (RFC 8291 — aes128gcm)

El Edge Function cifra el payload antes de mandarlo al push service. Nadie salvo el browser del usuario puede leer la notificación.

Pasos:
1. Genera un par ECDH efímero del servidor (solo para este mensaje)
2. Deriva un secreto compartido (ECDH) usando la clave pública `p256dh` del cliente
3. Deriva CEK (Content Encryption Key, 16 bytes) y Nonce (12 bytes) via HKDF-SHA256
4. Cifra el payload con AES-128-GCM
5. Construye el cuerpo: `salt (16) + rs (4) + keylen (1) + serverPubKey (65) + ciphertext`

### 4. VAPID JWT (RFC 8292)

El Edge Function firma un JWT con la `VAPID_PRIVATE_KEY` para autenticarse ante FCM:

```
Header: { typ: "JWT", alg: "ES256" }
Claims: { aud: "https://fcm.googleapis.com", exp: now+43200, sub: "mailto:..." }
Signature: ECDSA P-256 sobre headerB64.claimsB64
```

Se envía como: `Authorization: vapid t=<jwt>,k=<vapidPublicKey>`

---

## Base de Datos

### Tabla `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh_key  text NOT NULL,
  auth_key    text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)   -- soporte multi-dispositivo
);
```

El `UNIQUE(user_id, endpoint)` permite que el mismo usuario tenga múltiples dispositivos suscritos. Cada browser tiene su propio endpoint único.

### RLS Policies

```sql
-- Solo usuarios autenticados pueden gestionar sus propias suscripciones
CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Edge Function

**Archivo:** `supabase/functions/send-push-notification/index.ts`

### Cómo se llama

```typescript
// Desde el frontend — el cliente supabase agrega auth automáticamente
await supabase.functions.invoke('send-push-notification', {
  body: {
    groupId: '...',        // opcional — notifica a todos los miembros del grupo
    targetUserId: '...',   // opcional — notifica a un usuario específico
    title: '...',
    body: '...',
    icon: '/icon-192x192.png',
    tag: 'expense-...',
    data: { type: 'new_expense', groupId: '...' },
  }
});
```

### Lógica interna

1. Maneja CORS (OPTIONS → 204)
2. Valida que existan `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`
3. Si recibe `groupId` → consulta `group_members` para obtener los `user_id`
4. Busca todas las suscripciones de esos usuarios en `push_subscriptions`
5. Por cada suscripción:
   - Cifra el payload con AES-128-GCM
   - Firma el VAPID JWT
   - Hace POST al endpoint FCM/APNS
   - Si responde 410 o 404 → la suscripción expiró, la borra de la DB
6. Devuelve `{ sent, failed, results }`

### CORS — header crítico

```typescript
'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
```

**El `x-client-info` es obligatorio.** El cliente `supabase-js` lo agrega en cada request. Sin él, el browser hace el preflight OPTIONS (que devuelve 204), ve que el header no está permitido, y **bloquea el POST silenciosamente**. El resultado: el edge function nunca recibe el POST y no se manda ninguna notificación. Este fue el bug principal.

---

## Service Worker

**Archivo:** `frontend/public/sw.js`

Escucha el evento `push` y muestra la notificación:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      tag: data.tag,
      data: data.data,     // se pasa al click handler
    })
  );
});
```

Al hacer click en la notificación, `notificationclick` abre la URL correspondiente:

```javascript
self.addEventListener('notificationclick', (event) => {
  const { type, groupId } = event.notification.data;
  let url = '/dashboard';
  if (type === 'new_expense' && groupId) url = `/grupo/${groupId}`;
  if (type === 'settlement' && groupId) url = `/grupo/${groupId}?tab=liquidaciones`;
  // ...abre o enfoca la ventana
});
```

**Punto importante:** La VAPID public key está hardcodeada en `sw.js` para el evento `pushsubscriptionchange`. Si cambiás las VAPID keys, hay que actualizar ese valor en `sw.js` también.

---

## Hook del Cliente — usePushNotifications

**Archivo:** `frontend/hooks/usePushNotifications.ts`

### Estados que expone

```typescript
{
  isSupported: boolean,    // el browser soporta Web Push
  isSubscribed: boolean,   // este dispositivo está suscrito
  isLoading: boolean,
  error: string | null,
  permission: NotificationPermission,  // 'default' | 'granted' | 'denied'
  subscribe: () => Promise<void>,
  unsubscribe: () => Promise<void>,
}
```

### `subscribe()` — flujo

1. `Notification.requestPermission()` — pide permiso al usuario
2. `navigator.serviceWorker.ready` — espera que el SW esté activo
3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey })`
4. `supabase.from('push_subscriptions').upsert(...)` con `onConflict: 'user_id,endpoint'`
   - **Upsert, no insert**: si el mismo dispositivo ya estaba suscrito, actualiza las keys sin borrar los demás dispositivos del usuario.

### `unsubscribe()` — flujo

1. `pushManager.getSubscription()` — obtiene la suscripción activa en este browser
2. `subscription.unsubscribe()` — la cancela en el browser
3. Borra de DB filtrando por `user_id` **y** `endpoint` — solo borra este dispositivo, no los demás

### Soporte multi-dispositivo

El diseño anterior hacía `DELETE WHERE user_id = X` antes de insertar, lo que borraba todos los otros dispositivos del mismo usuario. Ahora cada dispositivo tiene su propia fila y el `UNIQUE(user_id, endpoint)` garantiza que no haya duplicados por dispositivo.

---

## NotificationService

**Archivo:** `frontend/lib/services/NotificationService.ts`

Wrapper que llama al edge function. Se usa en los hooks de operaciones:

```typescript
// Al crear un gasto — useExpenseOperations.ts
NotificationService.notifyNewExpense(groupId, description, amount, paidByName)

// Al crear una liquidación — useSettlementOperations.ts
NotificationService.notifySettlement(groupId, fromName, toName, amount)
```

Los métodos son `static async` y no se awaitan en los callers — se lanzan y se olvidan (fire-and-forget). Esto está bien porque no queremos que una falla de notificación bloquee la operación principal.

---

## Bugs Resueltos

### 1. NotificationService nunca se llamaba
**Síntoma:** Ninguna notificación llegaba nunca.  
**Causa:** El servicio existía pero nunca se importaba ni se llamaba desde los hooks de operaciones.  
**Fix:** Importar y llamar `NotificationService.notifyNewExpense()` en `useExpenseOperations.ts` y `NotificationService.notifySettlement()` en `useSettlementOperations.ts`.

### 2. Edge Function con timeout 504
**Síntoma:** El edge function tardaba 150 segundos y fallaba con 504.  
**Causa:** Usaba `import ... from 'https://esm.sh/...'` (imports en runtime) + `export default handler` (patrón viejo de Deno).  
**Fix:** Cambiar a `import ... from 'npm:@supabase/supabase-js@2'` y usar `Deno.serve(async (req) => {...})`.

### 3. Edge Function sin implementación de criptografía
**Síntoma:** La función tenía comentarios como "// insert functions here" sin código real.  
**Fix:** Implementar desde cero el cifrado RFC 8291 (AES-128-GCM con HKDF) y el VAPID JWT RFC 8292 usando la Web Crypto API nativa de Deno.

### 4. Headers VAPID incorrectos
**Síntoma:** FCM respondía 400.  
**Causa:** Se usaba `Authorization: WebPush ${jwt}` y `Content-Encoding: aesgcm` (formato viejo).  
**Fix:** Usar `Authorization: vapid t=${jwt},k=${pubKey}` y `Content-Encoding: aes128gcm`.

### 5. Edge Function enviaba a todos los suscriptores
**Síntoma:** Si había suscriptores de otros grupos, recibían notificaciones ajenas.  
**Causa:** No filtraba por `group_members`, consultaba toda la tabla `push_subscriptions`.  
**Fix:** Join con `group_members` para obtener solo los `user_id` del grupo correspondiente.

### 6. Toggle de suscripción no persistía entre recargas
**Síntoma:** Al recargar la página, el toggle volvía a "desactivado" aunque el dispositivo estaba suscrito.  
**Causa:** `checkSubscription()` no se llamaba al montar el componente si el usuario ya estaba cargado.  
**Fix:** Agregar un `useEffect` que ejecute `checkSubscription()` cuando `user` e `isSupported` están disponibles.

### 7. Toggle no se sincronizaba entre dispositivos
**Síntoma:** Activar en PC y desactivar en celu no se reflejaba al volver a la PC.  
**Causa:** El estado `isSubscribed` solo verifica la suscripción local del browser (via `pushManager.getSubscription()`), no la DB. Esto es correcto por diseño — cada dispositivo gestiona su propio estado de suscripción.  
**Conclusión:** No es un bug; es el comportamiento esperado del Web Push API.

### 8. CORS bloqueaba el POST desde el browser (bug principal final)
**Síntoma:** El edge function mostraba llamadas OPTIONS 204 en los logs pero nunca un POST. Las notificaciones nunca llegaban al crear gastos desde el frontend.  
**Causa:** El cliente `supabase-js` agrega el header `x-client-info` en cada request. El `Access-Control-Allow-Headers` del OPTIONS handler no lo incluía. El browser ve que el header no está permitido y bloquea el POST silenciosamente.  
**Fix:** Agregar `x-client-info` a `Access-Control-Allow-Headers` en el OPTIONS handler del edge function.

### 9. DELETE por user_id rompía soporte multi-dispositivo
**Síntoma:** Al suscribir un segundo dispositivo, el primero dejaba de recibir notificaciones.  
**Causa:** `subscribe()` hacía `DELETE WHERE user_id = X` antes de insertar la nueva suscripción.  
**Fix:** Reemplazar DELETE + INSERT con `upsert({ onConflict: 'user_id,endpoint' })`.

---

## Cómo Probar

### Desde la terminal (probar edge function directo)

```bash
curl -X POST "https://pmpedtfoszvsqfjhnkhf.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{
    "targetUserId": "<UUID_DEL_USUARIO>",
    "title": "Test",
    "body": "Mensaje de prueba",
    "icon": "/icon-192x192.png",
    "tag": "test"
  }'
```

Si responde `{"sent":1,"failed":0,...}` → el edge function y la suscripción en DB están OK.

### Verificar suscripciones en DB

```sql
SELECT user_id, LEFT(endpoint, 60) as endpoint_preview, created_at
FROM push_subscriptions
ORDER BY created_at DESC;
```

### Flujo de prueba end-to-end

1. Abrir la app en dispositivo A — activar push notifications (aceptar el permiso del browser)
2. Verificar que aparece 1 fila en `push_subscriptions`
3. Abrir la app en dispositivo B con **otra cuenta** del mismo grupo
4. Crear un gasto
5. Dispositivo A debería recibir la notificación en ~2 segundos

### Si no llega la notificación

1. Revisar logs del edge function en Supabase Dashboard → Functions → Logs
2. Verificar que haya un POST (no solo OPTIONS) en los logs
3. Si solo hay OPTIONS → problema de CORS, revisar `Access-Control-Allow-Headers`
4. Si hay POST pero `sent: 0` → no hay suscripciones en DB para ese grupo
5. Si hay POST con `failed: 1` y status 410/404 → la suscripción expiró, hay que re-suscribirse
6. Si hay POST con `failed: 1` y otro status → problema de cifrado o VAPID

---

## Variables de Entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel env | VAPID public key (base64url, 65 bytes) |
| `VAPID_PUBLIC_KEY` | Supabase Edge Function secrets | Misma key que la anterior |
| `VAPID_PRIVATE_KEY` | Supabase Edge Function secrets | VAPID private key — NUNCA exponer |
| `VAPID_SUBJECT` | Supabase Edge Function secrets | `mailto:tu@email.com` |
| `SUPABASE_URL` | Auto (Supabase) | Inyectada automáticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto (Supabase) | Inyectada automáticamente |
