import { useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useAgentEngine } from "@/lib/agentApi"
import { reloadPage } from "@/lib/browser"
import { cn } from "@/lib/utils"

/**
 * Phase C item 4 — SystemSwitch
 *
 * One-tap user-action affordance to flip agent routing between the Agent
 * Engine (default) and the Monolith fallback. Distinct from
 * EcosystemStatusBanner — that one is read-only platform-status telemetry,
 * this one is an explicit user action that rewrites localStorage and
 * forces a page reload so axios baseURL resolves fresh.
 *
 * Scope: super-admin only (matches AgentEngineToggle in settings). Surfaces
 * inline in AppShell next to EcosystemStatusBanner. Switching to Monolith
 * surfaces the W.1 deprecation note in the toast — production WS routing
 * only reaches the Agent Engine, so flipping to Monolith leaves chat/voice
 * unreachable from prod.
 */
export function SystemSwitch() {
  const queryClient = useQueryClient()
  const enabled = useAgentEngine()
  const [pending, setPending] = useState(false)

  const handleSwitch = () => {
    if (pending) return
    setPending(true)
    const next = !enabled
    try {
      localStorage.setItem("agent_engine_enabled", next ? "true" : "false")
    } catch {
      /* storage blocked — toast still confirms intent, but state may not persist */
    }
    queryClient.invalidateQueries({ queryKey: ["chat"] })
    queryClient.invalidateQueries({ queryKey: ["coaches"] })
    queryClient.invalidateQueries({ queryKey: ["agents-settings"] })

    toast.success(
      next
        ? "Switched to Agent Engine for this conversation"
        : "Switched to Monolith. Production WS only reaches the Agent Engine — chat/voice may be unreachable."
    )
    // Brief delay so the toast renders before the reload swallows it.
    setTimeout(() => {
      try {
        reloadPage()
      } catch {
        setPending(false)
      }
    }, 800)
  }

  const target = enabled ? "Agent Engine" : "Monolith"
  const next = enabled ? "Monolith" : "Agent Engine"

  return (
    <button
      type="button"
      onClick={handleSwitch}
      disabled={pending}
      data-testid="system-switch"
      aria-label={`Switch agent system. Current: ${target}. Click to switch to ${next}.`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm",
        "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
      title={`Current: ${target}. Click to switch to ${next}.`}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{target}</span>
      <span className="text-slate-400">→</span>
      <span className="text-slate-500">{next}</span>
    </button>
  )
}
