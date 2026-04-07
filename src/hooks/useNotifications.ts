import { useCallback, useEffect, useState } from 'react'
import {
  isSupported as checkSupported,
  subscribe as doSubscribe,
  unsubscribe as doUnsubscribe,
  getSubscription,
} from '@/services/notificationService'

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
    } finally {
      setLoading(false)
    }
  }, [supported, loading])

  return {
    isSupported: supported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  }
}
