import { useEffect, useRef } from "react"
import { getTurnstileSiteKey } from "./turnstile"

/**
 * Cloudflare Turnstile, rendered explicitly. The SITE key is public by design and
 * comes from `VITE_TURNSTILE_SITE_KEY`; the secret key never reaches the browser.
 *
 * With no site key configured it renders nothing and calls `onUnavailable`, so
 * the form can say registration is not available instead of showing a form that
 * can never be submitted. The token is single-use: bump `resetKey` after any
 * submit that did not succeed and a fresh challenge is rendered.
 */
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script")
      s.src = SCRIPT_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error("turnstile script failed to load"))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

export function TurnstileWidget({
  onToken,
  onUnavailable,
  resetKey = 0,
}: {
  onToken: (token: string | null) => void
  onUnavailable: () => void
  resetKey?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  // Latest callbacks without re-rendering the widget.
  const cb = useRef({ onToken, onUnavailable })
  cb.current = { onToken, onUnavailable }

  useEffect(() => {
    const siteKey = getTurnstileSiteKey()
    if (!siteKey) {
      cb.current.onUnavailable()
      return
    }
    let widgetId: string | null = null
    let cancelled = false
    cb.current.onToken(null)
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        widgetId = window.turnstile.render(box.current, {
          sitekey: siteKey,
          callback: (token: string) => cb.current.onToken(token),
          "expired-callback": () => cb.current.onToken(null),
          "error-callback": () => cb.current.onToken(null),
        })
      })
      .catch(() => {
        if (!cancelled) cb.current.onUnavailable()
      })
    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [resetKey])

  return <div ref={box} data-testid="turnstile-box" />
}
