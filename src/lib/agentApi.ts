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
 * Check whether the super-admin has toggled Agent Engine routing ON.
 * Reads from localStorage key "agent_engine_enabled".
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
 * - Toggle ON  → agentApi (ECS Fargate)
 * - Toggle OFF → api (monolith / CloudFront proxy)
 */
export function getApi() {
  return useAgentEngine() ? agentApi : api
}

export { syncAuthToken }
