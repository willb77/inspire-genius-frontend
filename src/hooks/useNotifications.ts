import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  isSupported as checkSupported,
  subscribe as doSubscribe,
  unsubscribe as doUnsubscribe,
  getSubscription, PushUnavailableError, isConfigured } from '@/services/notificationService'

type PermissionState = NotificationPermission | 'unsupported'

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<PermissionState>('default')
  const [loading, setLoading] = useState(false)
  const supported = checkSupported()

  // Check initial state
  useEffect(() => {
    if (!supported) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    getSubscription()
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => setIsSubscribed(false))
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported || loading) return
    setLoading(true)
    try {
      const subscription = await doSubscribe()
      setIsSubscribed(!!subscription)
      setPermission(Notification.permission)
    } catch (err) {
      console.error('[useNotifications] subscribe failed:', err)
      // Distinguish "this deployment cannot do push" from "your browser
      // blocked it" — telling someone to check their permissions when the
      // server has no VAPID key sends them to fix the wrong thing.
      toast.error(
        err instanceof PushUnavailableError
          ? err.message
          : "Failed to enable push notifications. Please check browser permissions.",
      )
    } finally {
      setLoading(false)
    }
  }, [supported, loading])

  const unsubscribe = useCallback(async () => {
    if (!supported || loading) return
    setLoading(true)
    try {
      const success = await doUnsubscribe()
      if (success) setIsSubscribed(false)
    } catch (err) {
      console.error('[useNotifications] unsubscribe failed:', err)
      toast.error("Failed to disable push notifications")
    } finally {
      setLoading(false)
    }
  }, [supported, loading])

  return {
    isSupported: supported,
    /** False when the deployment has no VAPID key — a separate failure from
     *  browser support, and one the user cannot fix themselves. */
    isConfigured: isConfigured(),
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  }
}
