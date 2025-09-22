import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { ROUTES } from '@/constants/routes'

export default function ProtectedRoute({ requireAuth = true }: { requireAuth?: boolean }) {
  const { isLoading, user, pendingVerification } = useAuth()

  if (isLoading) return null

  if (pendingVerification) {
    return <Navigate to={ROUTES.OTP} replace />
  }

  if (requireAuth && !user?.token) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <Outlet />
}
