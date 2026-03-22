import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initSentry } from './lib/sentry'
import './index.css'
import App from './App'

// Initialize error tracking before rendering
initSentry()

async function enableMocking() {
  if (import.meta.env.MODE !== 'development' || import.meta.env.VITE_MSW_ENABLED !== 'true') {
    return
  }
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
