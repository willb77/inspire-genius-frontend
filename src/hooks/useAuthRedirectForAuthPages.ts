import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROLES, ROUTES } from '@/constants/routes'

export function useAuthRedirectForAuthPages(): string | null {
  const { user } = useAuth()
  const location = useLocation()
  const path = location.pathname

  const hasToken = Boolean(user?.token)
  const isOnboarded = user?.isOnboardingCompleted === true
  const isSuperAdmin = (user?.role ?? '').toLowerCase() === ROLES.SUPER_ADMIN
  const isAuthPage = path === ROUTES.LOGIN || path === ROUTES.SIGNUP || path === ROUTES.OTP || path === '/forgot'

  if (hasToken && isAuthPage) {
    const state = location.state as { from?: string } | null
    const from = state?.from
    if (from && from !== path) return from
    if (!isOnboarded) return ROUTES.ONBOARDING.ONE
    if (isSuperAdmin) return ROUTES.SUPER_ADMIN.DASHBOARD
    return ROUTES.HOME
  }
  return null
}
