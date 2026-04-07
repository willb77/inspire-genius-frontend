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
import '@/lib/axios'

function AppInner() {
  useDirection()
  return useRoutes(routes)
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TourProvider>
            <AppInner />
            <Toaster richColors position="top-right" />
          </TourProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
