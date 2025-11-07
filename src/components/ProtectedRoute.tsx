import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROUTES, ROLES, PATHS } from '@/constants/routes'
import { useEffect, useRef, useState } from 'react'
import { secureRemoveItem } from '@/lib/secureStorage'
import LoadingPage from '@/components/loading-inspires-genius/LoadingCard'

export default function ProtectedRoute({ requireAuth = true }: { requireAuth?: boolean }) {
  const {user} = useAuth()
  const location = useLocation()
  const path = location.pathname
  const isCoachChat = /^\/dashboard\/[^/]+\/chat$/.test(path)
  
  const isOnboardingRoute = path.startsWith('/onboarding')

  // Show an animated loading screen briefly on path changes to avoid white-screen flashes
  const [booting, setBooting] = useState(true)
  const bootTimerRef = useRef<number | null>(null)
  useEffect(() => {
    // reset booting on every path change
    setBooting(true)
    if (bootTimerRef.current) window.clearTimeout(bootTimerRef.current)
    bootTimerRef.current = window.setTimeout(() => setBooting(false), 5000)
    return () => {
      if (bootTimerRef.current) window.clearTimeout(bootTimerRef.current)
      bootTimerRef.current = null
    }
  }, [])

  // When navigating away from CoachChat, clear its local storage state (conversation id and selected files)
  useEffect(() => {
    if (isCoachChat) return
    ;(async () => {
      try {
        await secureRemoveItem('conv')
      } catch {
        /* ignore */
      }
      try {
        // Remove all docsel:* keys
        const keys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('docsel:')) keys.push(k)
        }
        for (const k of keys) {
          await secureRemoveItem(k)
        }
      } catch {
        /* ignore */
      }
    })()
  }, [isCoachChat])

  if (booting) {
    return <LoadingPage />
  }

  if (requireAuth && (!user || !user?.token)) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: path }} replace />
  }

  // Enforce onboarding completion for protected areas (except onboarding routes)
  if (requireAuth && user?.token && user?.isOnboardingCompleted === false && !isOnboardingRoute) {
    return <Navigate to={ROUTES.ONBOARDING.ONE} replace />
  }

  // Enforce super-admin role for super admin routes
  if (path.startsWith(PATHS.SUPER_ADMIN_PREFIX)) {
    const role = (user?.role ?? '').toLowerCase()
    if (role !== ROLES.SUPER_ADMIN && user) {
      return <Navigate to={ROUTES.HOME} replace />
    }
  }

  return <Outlet />
}
