import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'

/**
 * Convert a URL-safe base64 VAPID public key to a Uint8Array
 * for use with PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check whether the browser supports push notifications.
 */
export function isSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Request browser permission for notifications.
 * Returns the resulting permission state.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) {
    return 'denied'
  }
  return Notification.requestPermission()
}

/**
 * Get the current push subscription from the active service worker, if any.
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Subscribe to push notifications using the VAPID public key from env.
 * Sends the subscription object to the backend.
 */
export async function subscribe(): Promise<PushSubscription | null> {
  if (!isSupported()) return null

  const permission = await requestPermission()
  if (permission !== 'granted') return null

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.warn('[notificationService] VITE_VAPID_PUBLIC_KEY is not set')
    return null
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  // Send subscription to backend
  await api.post<BaseApiResponse<unknown>>('/v1/notifications/subscribe', {
    subscription: subscription.toJSON(),
  })

  return subscription
}

/**
 * Unsubscribe from push notifications and notify the backend.
 */
export async function unsubscribe(): Promise<boolean> {
  const subscription = await getSubscription()
  if (!subscription) return false

  const success = await subscription.unsubscribe()
  if (success) {
    try {
      await api.post<BaseApiResponse<unknown>>('/v1/notifications/unsubscribe', {
        endpoint: subscription.endpoint,
      })
    } catch {
      // Best-effort backend notification
    }
  }
  return success
}
