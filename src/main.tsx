import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initSentry } from './lib/sentry'
import './lib/i18n'
import './index.css'
// Registers every vertical with Vertical Core (side-effect import).
import './verticals'
import App from './App'
import { applyFlagOverridesFromUrl } from './lib/flagEscapeHatch'

// Apply any ?flags=/?surfaces=/?agent_engine= override BEFORE the first route
// resolves — the route resolver itself reads these flags, so applying them
// later would need a reload to take effect. See lib/flagEscapeHatch.ts for why
// a URL hatch exists at all: both flags are per-browser localStorage with no
// in-app switch left, so a stale "false" pins a user to the old app with no way
// back they can reach.
try { applyFlagOverridesFromUrl() } catch { /* never block boot on a flag */ }

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
