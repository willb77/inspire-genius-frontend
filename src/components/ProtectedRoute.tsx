import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROUTES, PATHS } from '@/constants/routes'
import { hasAccess } from '@/types/roles'
import { HOME_ROUTE_BY_ROLE } from '@/constants/navigation'
import { isUserRole } from '@/types/roles'
import { useEffect, useRef, useState } from 'react'
import { secureRemoveItem } from '@/lib/secureStorage'
import LoadingPage from '@/components/loading-inspires-genius/LoadingCard'

/** All admin-like route prefixes that require role checks */
const ROLE_PREFIXES = [
  PATHS.SUPER_ADMIN_PREFIX,
  PATHS.MANAGER_PREFIX,
  PATHS.COMPANY_ADMIN_PREFIX,
  PATHS.PRACTITIONER_PREFIX,
  PATHS.DISTRIBUTOR_PREFIX,
]

export default function ProtectedRoute({ requireAuth = true }: { requireAuth?: boolean }) {
  const {user} = useAuth()
  const location = useLocation()
  const path = location.pathname
  const isCoachChat = /^\/dashboard\/[^/]+\/chat$/.test(path)

  // Brief loading screen on initial mount to avoid white-screen flash while auth hydrates
  const [booting, setBooting] = useState(true)
  const bootTimerRef = useRef<number | null>(null)
  useEffect(() => {
    bootTimerRef.current = window.setTimeout(() => setBooting(false), 300)
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

  // Forced onboarding is intentionally DISABLED (2026-07-21). Every authenticated
  // user goes straight to their destination — the onboarding wizard remains
  // reachable at /onboarding/* for anyone who wants it, but no one is bounced
  // there. This unblocks migrated users (magic-link should land every
  // authenticated user on /home) and removes the redirect loop for accounts
  // whose auth response lacks a truthy `is_onboarded` (e.g. Cognito login).
  // (Previously: redirect to ROUTES.ONBOARDING.ONE when isOnboardingCompleted === false.)

  // Enforce role-based access for any role-prefixed route
  const isRolePrefixedRoute = ROLE_PREFIXES.some((prefix) => path.startsWith(prefix))
  if (isRolePrefixedRoute && user) {
    const role = (user.role ?? '').toLowerCase()
    if (!hasAccess(role, path)) {
      // Redirect to the user's own home route
      const home = isUserRole(role) ? HOME_ROUTE_BY_ROLE[role] : ROUTES.HOME
      return <Navigate to={home} replace />
    }
  }

  return <Outlet />
}
