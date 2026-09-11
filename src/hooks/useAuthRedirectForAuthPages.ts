import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROLES, ROUTES } from '@/constants/routes'

export function useAuthRedirectForAuthPages(): string | null {
  const { user } = useAuth()
  const location = useLocation()
  const path = location.pathname

  const hasToken = Boolean(user?.token)
  const isSuperAdmin = (user?.role ?? '').toLowerCase() === ROLES.SUPER_ADMIN
  const isAuthPage = path === ROUTES.LOGIN || path === ROUTES.SIGNUP || path === ROUTES.OTP || path === '/forgot'

  if (hasToken && isAuthPage) {
    const state = location.state as { from?: string } | null
    const from = state?.from
    if (from && from !== path) return from
    // Deliberately NOT bounced to the onboarding wizard.
    //
    // Forced onboarding was disabled everywhere on 2026-07-21 (see
    // ProtectedRoute and AuthContext.navigateAfterAuth, which both route
    // straight to the role home). This hook was the last place a falsey
    // onboarding flag could still redirect, and it fires on an ordinary
    // action: an already-signed-in user opening /login from a bookmark or
    // an old emailed link.
    //
    // It is not a safe default either, because a falsey flag does not mean
    // "has not onboarded" — it also means "unknown". The flag is a Cognito
    // custom attribute, and it is absent from at least one environment's
    // user-pool schema, so it can never read true there; password logins
    // report the real (missing) value while magic-link logins mint `true`
    // unconditionally. Same user, same account, different answer per login
    // method. Until that flag is trustworthy, absence must not send someone
    // into a wizard they may have completed months ago.
    //
    // The wizard stays reachable at /onboarding/* for anyone who wants it.
    if (isSuperAdmin) return ROUTES.SUPER_ADMIN.DASHBOARD
    return ROUTES.HOME
  }
  return null
}
