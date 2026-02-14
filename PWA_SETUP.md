# 🎉 PWA con Push Notifications - Implementación Completa

## ✅ Lo que ya está hecho

### Backend (Supabase)
- ✅ Tabla `push_subscriptions` creada con RLS policies
- ✅ Edge Function `send-push-notification` desplegada
- ✅ Migration ejecutada exitosamente

### Frontend (Next.js)
- ✅ Service Worker (`public/sw.js`)
- ✅ Manifest PWA (`public/manifest.json`)
- ✅ Hook personalizado (`hooks/usePushNotifications.ts`)
- ✅ Componente UI (`components/PushNotificationToggle.tsx`)
- ✅ Servicio de notificaciones (`lib/services/NotificationService.ts`)
- ✅ Registro de SW en `_app.tsx`
- ✅ Toggle agregado al dashboard

## 📝 Tareas pendientes

### 1. Generar Íconos PNG

Los íconos SVG placeholder ya están creados en `public/`. Necesitas convertirlos a PNG:

**Opción A: Herramienta Online (Recomendada)**
1. Ve a https://realfavicongenerator.net/ o https://www.favicon-generator.org/
2. Sube el logo de tu app o usa el SVG generado
3. Genera los íconos en tamaños 192x192 y 512x512
4. Descarga y reemplaza:
   - `public/icon-192x192.png`
   - `public/icon-512x512.png`

**Opción B: Convertir SVG a PNG con comando (si tienes ImageMagick)**
```bash
# Instalar ImageMagick si no lo tienes
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Convertir SVG a PNG
magick convert public/icon-192x192.svg public/icon-192x192.png
magick convert public/icon-512x512.svg public/icon-512x512.png
```

**Opción C: Usar el mismo SVG temporalmente**
Por ahora, los navegadores modernos soportan SVG en el manifest. Puedes actualizar `manifest.json`:
```json
{
  "icons": [
    {
      "src": "/icon-192x192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

### 2. Configurar VAPID Keys en Supabase

Tu VAPID public key ya está en `.env.local`. Ahora necesitas agregar la **private key** a Supabase:

**Generar par de VAPID keys (si no las tienes)**:
```bash
cd frontend
npx web-push generate-vapid-keys
```

Esto genera algo como:
```
Public Key: BNF1jHh1KzT_vq9uCheeFTY1jEpMML5YkeQTOZoeWzEBqgj0_07-lQaLqFO4CafPFNQrgvjMgaU1sfv0KbQ5eik
Private Key: xYz123AbCdEfGhIjKlMnOpQrStUvWxYz…
```

**Agregar secrets a Supabase Edge Function**:
```bash
# Opción A: Desde Supabase Dashboard
# 1. Ve a https://supabase.com/dashboard/project/pmpedtfoszvsqfjhnkhf/settings/functions
# 2. En "Function Secrets", agrega:
VAPID_PUBLIC_KEY=BNF1jHh1KzT_vq9uCheeFTY1jEpMML5YkeQTOZoeWzEBqgj0_07-lQaLqFO4CafPFNQrgvjMgaU1sfv0KbQ5eik
VAPID_PRIVATE_KEY=tu_clave_privada_aqui

# Opción B: Desde CLI (si tienes supabase CLI instalado)
supabase secrets set VAPID_PUBLIC_KEY="BNF1jHh1KzT_vq9uCheeFTY1jEpMML5YkeQTOZoeWzEBqgj0_07-lQaLqFO4CafPFNQrgvjMgaU1sfv0KbQ5eik"
supabase secrets set VAPID_PRIVATE_KEY="tu_clave_privada_aqui"
```

### 3. Actualizar Service Worker con tu VAPID key

Edita `public/sw.js` en la línea 151:
```javascript
applicationServerKey: urlBase64ToUint8Array(
  'TU_VAPID_PUBLIC_KEY_AQUI' // Reemplazar con tu key
)
```

### 4. Probar en Desarrollo

```bash
cd frontend
npm run dev
```

1. Abre https://localhost:3000/dashboard (debe ser HTTPS o localhost)
2. Ve al toggle de notificaciones
3. Haz clic para activar
4. Acepta el permiso del navegador
5. Verifica en DevTools → Application → Service Workers

### 5. Enviar Notificación de Prueba

Puedes probar enviando una notificación desde el código:

```typescript
// En cualquier parte de tu código (ej: después de crear un gasto)
import { NotificationService } from '@/lib/services/NotificationService';

// Enviar notificación a un grupo
await NotificationService.notifyNewExpense(
  'group-id',
  'Pizza',
  25.50,
  'Juan'
);
```

O probar directamente la Edge Function desde Supabase Dashboard:
1. Ve a Functions → send-push-notification
2. Test payload:
```json
{
  "title": "Test",
  "body": "Probando notificaciones",
  "groupId": "tu-group-id-aqui"
}
```

## 🧪 Testing Checklist

- [ ] Íconos PNG generados (192x192 y 512x512)
- [ ] VAPID private key agregada a Supabase secrets
- [ ] Service Worker registrado (DevTools → Application)
- [ ] Toggle de notificaciones funciona
- [ ] Permiso del navegador aceptado
- [ ] Suscripción guardada en `push_subscriptions` table
- [ ] Notificación de prueba enviada exitosamente
- [ ] Notificación recibida en el navegador
- [ ] Click en notificación abre la app correctamente
- [ ] App instalable (aparece "Instalar" en el navegador)

## 🔍 Troubleshooting

### "Service Worker no se registra"
- Verifica que `sw.js` esté en `public/` (accesible en `/sw.js`)
- Abre DevTools → Console para ver errores
- En Development, Next.js a veces cachea. Haz hard refresh (Ctrl+Shift+R)

### "Permiso denegado"
- El usuario debe hacer clic en "Permitir"
- Si bloqueó antes, debe ir a configuración del navegador y desbloquear

### "VAPID key inválida"
- Verifica que `NEXT_PUBLIC_VAPID_PUBLIC_KEY` esté en `.env.local`
- Debe estar en formato URL-safe base64
- Asegúrate de que la key del Service Worker coincida

### "Edge Function falla al enviar"
- Verifica los secrets en Supabase Dashboard
- Revisa logs de Edge Function en Supabase
- Prueba la función directamente desde el dashboard

### "Notificaciones no llegan"
- Verifica que haya suscripciones en la tabla `push_subscriptions`
- Revisa que el `groupId` sea correcto
- Verifica que el usuario esté en el grupo (RLS)
- Algunos navegadores bloquean notificaciones en modo incógnito

## 📱 Compatibilidad

| Browser | Push Notifications | PWA Install |
|---------|-------------------|-------------|
| Chrome  | ✅ | ✅ |
| Edge    | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari  | ⚠️ Limitado | ⚠️ Limitado |
| iOS Safari | ❌ | ⚠️ Básico |

**Nota**: Safari en iOS tiene soporte muy limitado para push notifications. Funciona mejor en macOS.

## 🚀 Deploy a Producción

1. **Generar build**:
```bash
cd frontend
npm run build
```

2. **Verificar que funciona con HTTPS**:
   - Push notifications requieren HTTPS
   - localhost está exento (funciona sin HTTPS)
   - En producción, asegúrate de tener SSL

3. **Deploy**:
   - Vercel/Netlify automáticamente sirven con HTTPS
   - Si usas servidor propio, configura SSL (Let's Encrypt)

## 🎯 Próximos Pasos (Opcional)

- [ ] Agregar notificación cuando se modifica/elimina un gasto
- [ ] Permitir configurar qué notificaciones recibir (settings)
- [ ] Agregar sonido personalizado a las notificaciones
- [ ] Implementar notificaciones programadas (gastos recurrentes)
- [ ] Agregar badges con contador de notificaciones no leídas

## 📚 Recursos

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Supabase Functions](https://supabase.com/docs/guides/functions)

---

¡Tu PWA con push notifications está lista! 🎉
