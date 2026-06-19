import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROUTES, PATHS } from '@/constants/routes'
import { hasAccess } from '@/types/roles'
import { HOME_ROUTE_BY_ROLE } from '@/constants/navigation'
import { isUserRole } from '@/types/roles'
import { useEffect, useRef, useState } from 'react'
import { secureRemoveItem } from '@/lib/secureStorage'
import { shouldSkipOnboarding } from '@/lib/deployEnv'
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

  const isOnboardingRoute = path.startsWith('/onboarding')

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

  // Enforce onboarding completion for protected areas (except onboarding routes).
  // Skipped in dev + staging-b per Bill 2026-06-19: admin-provisioned users
  // arrive fully ready and shouldn't be bounced through the wizard.
  if (
    requireAuth
    && user?.token
    && user?.isOnboardingCompleted === false
    && !isOnboardingRoute
    && !shouldSkipOnboarding()
  ) {
    return <Navigate to={ROUTES.ONBOARDING.ONE} replace />
  }

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
