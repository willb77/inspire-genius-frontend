import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Activity } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { agentApi } from "@/lib/agentApi"

type HealthStatus = {
  healthy: boolean
  agentCount: number | null
  checking: boolean
}

export default function AgentEngineToggle() {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(() => {
    try {
      const val = localStorage.getItem("agent_engine_enabled")
      // Default ON when unset — matches useAgentEngine() in agentApi.ts.
      // The Monolith path is officially deprecated as of 2026-05-07; this
      // toggle is retained for super-admin emergency fallback only.
      if (val === null) return true
      return val === "true"
    } catch {
      return true
    }
  })

  const [health, setHealth] = useState<HealthStatus>({
    healthy: false,
    agentCount: null,
    checking: true,
  })

  const checkHealth = useCallback(async () => {
    setHealth((prev) => ({ ...prev, checking: true }))
    try {
      const { data } = await agentApi.get("/v1/agents/health")
      const count =
        data?.active_agents ?? data?.agent_count ?? data?.data?.active_agents ?? null
      setHealth({ healthy: true, agentCount: count, checking: false })
    } catch {
      setHealth({ healthy: false, agentCount: null, checking: false })
    }
  }, [])

  // Health check on mount + every 30s
  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    try {
      localStorage.setItem("agent_engine_enabled", checked ? "true" : "false")
    } catch { /* storage blocked */ }

    // Invalidate agent-related caches so components re-fetch from the new target
    queryClient.invalidateQueries({ queryKey: ["coaches"] })
    queryClient.invalidateQueries({ queryKey: ["agents-settings"] })
    queryClient.invalidateQueries({ queryKey: ["chat"] })

    toast.success(
      checked
        ? "Agent calls routed to Agent Engine (ECS Fargate)"
        : "Agent calls routed to Monolith (CloudFront proxy)"
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold">
          Agent Engine Routing
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Agent Engine is the canonical system. The Monolith path is
          retained as an emergency fallback only.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="agent-engine-toggle" className="text-sm font-medium">
            Route agent calls to Agent Engine
          </Label>
          <Switch
            id="agent-engine-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            className="data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-600"
          />
        </div>

        {/* Current target */}
        <p className="text-sm text-muted-foreground">
          Current target:{" "}
          <span className="font-medium">
            {enabled
              ? "Agent Engine (ECS Fargate)"
              : "Monolith (CloudFront proxy)"}
          </span>
        </p>

        {/* Health indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          {health.checking ? (
            <span className="text-muted-foreground">Checking health...</span>
          ) : health.healthy ? (
            <span className="text-green-600 font-medium">
              Healthy
              {health.agentCount != null && ` (${health.agentCount} agents)`}
            </span>
          ) : (
            <span className="text-red-600 font-medium">Unavailable</span>
          )}
        </div>

        {/* Warning callout */}
        <div className="flex gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Monolith path is officially deprecated (2026-05-07). Production
            WebSocket routing only reaches the Agent Engine; switching to
            Monolith here will leave chat/voice unreachable from prod. Use
            only as an emergency fallback for non-WS routes.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
