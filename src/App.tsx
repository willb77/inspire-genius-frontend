import { useRoutes } from 'react-router-dom'
import { routes } from './routes'
import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { TourProvider } from '@/context/TourContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/lib/axios'

const queryClient = new QueryClient()

function App() {
  const element = useRoutes(routes)
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TourProvider>
              {element}
              <Toaster richColors position="top-right" />
            </TourProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
