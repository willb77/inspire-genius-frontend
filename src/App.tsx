import { useRoutes } from 'react-router-dom'
import { routes } from './routes'
import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { AssessmentProvider } from './context/AssessmentContext'
import { Toaster } from '@/components/ui/sonner'
import { TourProvider } from '@/context/TourContext'
import '@/lib/axios'

const queryClient = new QueryClient()

function App() {
  const element = useRoutes(routes)
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AssessmentProvider>
          <TourProvider>
            {element}
            <Toaster richColors position="top-right" />
          </TourProvider>
        </AssessmentProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
