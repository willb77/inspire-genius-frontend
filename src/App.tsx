import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from './routes'
import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { TourProvider } from '@/context/TourContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useDirection } from '@/hooks/useDirection'
import RoleSelector from '@/components/auth/RoleSelector'
import { useAuth } from '@/context/useAuth'
import { checkForUpdate } from '@/lib/buildVersion'
import '@/lib/axios'

function RoleSelectorWrapper() {
  const { pendingRoleSelection, selectRole } = useAuth()
  if (!pendingRoleSelection) return null
  return (
    <RoleSelector
      open={true}
      roles={pendingRoleSelection.roles}
      onSelect={selectRole}
    />
  )
}

function AppInner() {
  useDirection()
  useEffect(() => {
    // Reaching here means the bundle parsed and React mounted, so whatever
    // asset failure `public/ig-recovery.js` recovered from is resolved. Release
    // its one-shot guard, otherwise a genuine failure later in this same tab
    // session would find the guard set and refuse to self-heal.
    try {
      sessionStorage.removeItem('__ig_asset_recovery_attempted')
    } catch {
      // Storage unavailable (private mode) — the guard could not have been set.
    }

    // Catches stale long-lived tabs: if the bundle was deployed after this
    // tab loaded, the next time the user activates the page the check
    // triggers a clean reload.
    void checkForUpdate()
  }, [])
  return useRoutes(routes)
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TourProvider>
            <AppInner />
            <RoleSelectorWrapper />
            <Toaster richColors position="top-right" />
          </TourProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
