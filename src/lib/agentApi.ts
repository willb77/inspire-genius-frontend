import axios from 'axios'
import { api, attachInterceptors, syncAuthToken } from '@/lib/axios'

/**
 * Singleton axios instance pointed at the Agent Engine (ECS Fargate).
 * Falls back to VITE_API_BASE_URL so the app works even when the env var is missing.
 */
export const agentApi = axios.create({
  baseURL: import.meta.env.VITE_AGENT_ENGINE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true,
})

attachInterceptors(agentApi)

// Keep agentApi default header in sync with api
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('auth:token', ((e: CustomEvent<{ token: string }>) => {
      const token = e.detail?.token
      if (token) agentApi.defaults.headers.common['access-token'] = token
      else delete agentApi.defaults.headers.common['access-token']
    }) as EventListener)
  } catch { /* ignore */ }
}

/**
 * Check whether the Agent Engine is enabled (default: TRUE).
 *
 * The Agent Engine is always the primary system. Setting
 * `agent_engine_enabled=false` in localStorage falls back to the monolith
 * for agent/chat endpoints only. General API routing is controlled
 * separately by `monolith_enabled` in localStorage (see axios.ts).
 */
export function useAgentEngine(): boolean {
  try {
    const val = localStorage.getItem('agent_engine_enabled')
    // Default to TRUE (Agent Engine is the primary system).
    // Only return false if explicitly set to "false".
    if (val === null) return true
    return val === 'true'
  } catch {
    return true
  }
}

/**
 * Return the appropriate axios instance based on the Agent Engine toggle.
 * - Toggle ON  → agentApi (ECS Fargate — default)
 * - Toggle OFF → api (monolith / CloudFront proxy — backup)
 */
export function getApi() {
  return useAgentEngine() ? agentApi : api
}

/**
 * Check whether the monolith is enabled as the primary API backend.
 * Default: false (API Gateway / microservices are primary).
 *
 * To re-enable the monolith:
 *   localStorage.setItem('monolith_enabled', 'true')
 *   window.location.reload()
 */
export function isMonolithEnabled(): boolean {
  try {
    return localStorage.getItem('monolith_enabled') === 'true'
  } catch {
    return false
  }
}

export { syncAuthToken }
