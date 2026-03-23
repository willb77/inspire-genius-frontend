import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initSentry } from './lib/sentry'
import './index.css'
import App from './App'

// Initialize error tracking before rendering
try { initSentry() } catch { /* ignore */ }

async function enableMocking() {
  if (import.meta.env.MODE !== 'development' || import.meta.env.VITE_MSW_ENABLED !== 'true') {
    return
  }
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  } catch (err) {
    console.warn('[MSW] Failed to start:', err)
  }
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

enableMocking().then(renderApp).catch(() => {
  // Fallback: render even if mocking setup fails entirely
  renderApp()
})
