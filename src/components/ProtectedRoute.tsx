import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROUTES, ROLES, PATHS } from '@/constants/routes'

export default function ProtectedRoute({ requireAuth = true }: { requireAuth?: boolean }) {
  const {user} = useAuth()
  const location = useLocation()
  const path = location.pathname
  
  const isOnboardingRoute = path.startsWith('/onboarding')

  if (requireAuth && user && !user?.token) {
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
 