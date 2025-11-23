import { useCallback } from 'react'
import { supabase } from '../supabaseClient'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export const usePushNotifications = () => {
  const subscribe = useCallback(async () => {
    if (!isPushSupported()) throw new Error('Push not supported in this browser')

    // Register service worker
    const reg = await navigator.serviceWorker.register('/sw.js')

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Permission not granted for Notifications')

    // Subscribe to push
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    })

    const subJson = subscription.toJSON() as any
    const keys = subJson.keys || {}

    // Get current user id from supabase client
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id ?? null

    // Send to our subscribe endpoint
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        endpoint: subJson.endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        ua: navigator.userAgent
      })
    })

    return subscription
  }, [])

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      // Remove on server by endpoint
      const subJson = subscription.toJSON() as any
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subJson.endpoint })
      })
      await subscription.unsubscribe()
    }
  }, [])

  return { subscribe, unsubscribe }
}
