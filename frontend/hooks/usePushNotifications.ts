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

  // Check notification support
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

  // Check if already subscribed (silent — the user has not done anything yet)
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
      // SW not ready on page load — do not show an error, the user did nothing
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

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user) {
      setError('You must be signed in to subscribe');
      return;
    }

    if (!isSupported) {
      setError('Your browser does not support push notifications');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // 2. Get the ready SW; if it takes too long, re-register it explicitly
      let registration: ServiceWorkerRegistration;
      try {
        registration = await waitForReadyRegistration(15000);
      } catch {
        // Fallback: register the SW manually and wait for activation
        registration = await navigator.serviceWorker.register('/sw.js');
        const swToActivate = registration.installing || registration.waiting;
        if (swToActivate) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('The Service Worker could not activate. Close and reopen the app and try again.')),
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
          throw new Error('The Service Worker is not available. Close and reopen the app and try again.');
        }
      }

      // Brief pause so iOS processes the permission before subscribing
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Subscribe to the push manager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Notification configuration is incomplete');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Save subscription to the database
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
      console.log('[Push] Subscription successful');
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe. Please try again.');
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('No active subscription found');
        setIsSubscribed(false);
        return;
      }

      // 1. Unsubscribe from the push manager
      await subscription.unsubscribe();

      // 2. Remove from the database
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);

      if (dbError) throw dbError;

      setIsSubscribed(false);
      console.log('Unsubscribe successful');
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
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

// Helper: converts a VAPID key from base64 to Uint8Array
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
