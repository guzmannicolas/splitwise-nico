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

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuthUser();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Verificar soporte de notificaciones
  useEffect(() => {
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    setIsSupported(supported);

    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    checkSubscription();
  }, []);

  // Verificar si ya está suscrito
  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError(err instanceof Error ? err.message : 'Error al verificar suscripción');
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

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

      // 2. Esperar a que el SW esté listo y activo
      let registration = await navigator.serviceWorker.ready;
      
      // Si el SW se está actualizando, esperar a que se active
      if (registration.installing) {
        await new Promise((resolve) => {
          registration.installing!.addEventListener('statechange', (e: Event) => {
            const target = e.target as ServiceWorker;
            if (target.state === 'activated') {
              resolve(null);
            }
          });
        });
        registration = await navigator.serviceWorker.ready;
      }

      // Pequeña espera adicional para asegurar que esté completamente listo
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Suscribirse al push manager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key no configurada');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Guardar suscripción en la base de datos
      const subscriptionJSON = subscription.toJSON();

      // Primero intentar eliminar suscripción existente
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Luego insertar la nueva
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh_key: subscriptionJSON.keys!.p256dh!,
          auth_key: subscriptionJSON.keys!.auth!,
        });

      if (dbError) throw dbError;

      setIsSubscribed(true);
      console.log('Suscripción exitosa');
    } catch (err) {
      console.error('Error al suscribirse:', err);
      setError(err instanceof Error ? err.message : 'Error al suscribirse');
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
