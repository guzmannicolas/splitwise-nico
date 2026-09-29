import { useState, useEffect, useCallback } from 'react';
import { useAuthUser } from '../lib/hooks/useAuthUser';
import { supabase } from '../lib/supabaseClient';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

async function waitForReadyRegistration(timeoutMs: number): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    ),
  ]);
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuthUser();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Verificar soporte de notificaciones
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSPWA = isIOS && (navigator as any).standalone === true;
    const isIOSChrome = /CriOS/.test(navigator.userAgent);

    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      (!isIOS || isIOSPWA) &&
      !isIOSChrome;

    setIsSupported(supported);

    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Verificar si ya está suscrito (silencioso — el usuario no hizo nada todavía)
  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      const registration = await waitForReadyRegistration(12000);
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      // SW no listo al cargar la página — no mostrar error, el usuario no hizo nada
      console.warn('[Push] SW not ready on initial check:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  useEffect(() => {
    if (user && isSupported) {
      checkSubscription();
    }
  }, [user, isSupported, checkSubscription]);

  // Suscribirse a push notifications
  const subscribe = useCallback(async () => {
    if (!user) {
      setError('Debes iniciar sesión para suscribirte');
      return;
    }

    if (!isSupported) {
      setError('Tu navegador no soporta notificaciones push');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Solicitar permiso
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      // 2. Obtener el SW listo; si tarda demasiado, re-registrarlo explícitamente
      let registration: ServiceWorkerRegistration;
      try {
        registration = await waitForReadyRegistration(15000);
      } catch {
        // Fallback: registrar el SW manualmente y esperar su activación
        registration = await navigator.serviceWorker.register('/sw.js');
        const swToActivate = registration.installing || registration.waiting;
        if (swToActivate) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('El Service Worker no pudo activarse. Cerrá y reabrí la app e intentá de nuevo.')),
              12000
            );
            swToActivate.addEventListener('statechange', (e: Event) => {
              if ((e.target as ServiceWorker).state === 'activated') {
                clearTimeout(timeout);
                resolve();
              }
            });
          });
        } else if (!registration.active) {
          throw new Error('El Service Worker no está disponible. Cerrá y reabrí la app e intentá de nuevo.');
        }
      }

      // Pausa breve para que iOS procese el permiso antes de suscribir
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Suscribirse al push manager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Configuración de notificaciones incompleta');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Guardar suscripción en la base de datos
      const subscriptionJSON = subscription.toJSON();

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh_key: subscriptionJSON.keys!.p256dh!,
          auth_key: subscriptionJSON.keys!.auth!,
        }, { onConflict: 'user_id,endpoint' });

      if (dbError) throw dbError;

      setIsSubscribed(true);
      console.log('[Push] Suscripción exitosa');
    } catch (err) {
      console.error('[Push] Error al suscribirse:', err);
      setError(err instanceof Error ? err.message : 'Error al suscribirse. Intentá de nuevo.');
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  // Desuscribirse de push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('No hay suscripción activa');
        setIsSubscribed(false);
        return;
      }

      // 1. Desuscribirse del push manager
      await subscription.unsubscribe();

      // 2. Eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);

      if (dbError) throw dbError;

      setIsSubscribed(false);
      console.log('Desuscripción exitosa');
    } catch (err) {
      console.error('Error al desuscribirse:', err);
      setError(err instanceof Error ? err.message : 'Error al desuscribirse');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    subscribe,
    unsubscribe,
  };
}

// Helper: Convierte VAPID key de base64 a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
