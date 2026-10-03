import axios from 'axios'
import { attachInterceptors } from '@/lib/axios'

/**
 * Axios instance for the Claude Code console (CC.3).
 *
 * The console has its OWN HTTP API (`ig-{env}-dev-console`), the way
 * asset-library does, so it gets its own instance — the same pattern as
 * `agentApi`. Token injection and 401 refresh come from the shared
 * `attachInterceptors`, so no call site ever adds an auth header by hand.
 *
 * `VITE_DEV_CONSOLE_URL` unset means the console does not exist on this tier.
 * The baseURL is then empty and `isDevConsoleConfigured()` is false, and the
 * access probe never fires — the Help & Support page renders exactly as it did
 * before this package. It deliberately does NOT fall back to the API host or
 * the SPA host: a relative `/v1/dev-console/me` on the SPA host is answered by
 * CloudFront's error rewrite with a 200 and index.html.
 */
const DEV_CONSOLE_URL: string = import.meta.env.VITE_DEV_CONSOLE_URL || ''

export const devConsoleApi = axios.create({
  baseURL: DEV_CONSOLE_URL,
})

attachInterceptors(devConsoleApi)

/** True only when this build was given a console URL. */
export function isDevConsoleConfigured(): boolean {
  return Boolean(devConsoleApi.defaults.baseURL)
}
