import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Save, ScrollText } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  getInteractionProtocol,
  updateInteractionProtocol,
  type InteractionProtocol as ProtocolData,
} from "@/services/agent/protocolService"
import { AGENT_VOICE_CONFIG, getDomainColor } from "@/constants/agentVoiceConfig"

export default function InteractionProtocol() {
  const [protocol, setProtocol] = useState<ProtocolData | null>(null)
  const [protocolText, setProtocolText] = useState("")
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [assignMode, setAssignMode] = useState<"all" | "selected">("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getInteractionProtocol()
      .then((data) => {
        if (cancelled) return
        setProtocol(data)
        setProtocolText(data.protocol)
        const ids = data.agent_ids ?? []
        setSelectedAgentIds(ids)
        setAssignMode(ids.length > 0 ? "selected" : "all")
      })
      .catch((err) => {
        if (cancelled) return
        const message = err?.response?.data?.detail || err?.message || "Failed to load protocol"
        setError(message)
        toast.error("Failed to load interaction protocol")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const agentIds = assignMode === "all" ? [] : selectedAgentIds
      const result = await updateInteractionProtocol(protocolText, protocol?.version, agentIds)
      setProtocol((prev) =>
        prev
          ? { ...prev, protocol: protocolText, version: result.version, updated_at: result.updated_at || new Date().toISOString(), agent_ids: agentIds }
          : prev,
      )
      const scopeLabel = assignMode === "all"
        ? "all agents"
        : `${selectedAgentIds.length} agent${selectedAgentIds.length !== 1 ? "s" : ""}`
      toast.success(`Protocol v${result.version} saved for ${scopeLabel}`)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Failed to save protocol"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    )
  }

  const selectAllInDomain = (domain: string) => {
    const domainAgents = AGENT_VOICE_CONFIG.filter((a) => a.domain === domain).map((a) => a.id)
    setSelectedAgentIds((prev) => {
      const existing = new Set(prev)
      const allSelected = domainAgents.every((id) => existing.has(id))
      if (allSelected) {
        return prev.filter((id) => !domainAgents.includes(id))
      }
      return [...new Set([...prev, ...domainAgents])]
    })
  }

  const tokenEstimate = Math.round(protocolText.length / 4)
  const textDirty = protocol !== null && protocolText !== protocol.protocol
  const agentsDirty = protocol !== null && (
    (assignMode === "all" && (protocol.agent_ids?.length ?? 0) > 0) ||
    (assignMode === "selected" && (
      selectedAgentIds.length !== (protocol.agent_ids?.length ?? 0) ||
      !selectedAgentIds.every((id) => protocol.agent_ids?.includes(id))
    ))
  )
  const isDirty = textDirty || agentsDirty

  const domains = ["coaching", "business", "system", "career"] as const

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Interaction Protocol</h1>
          </div>
          <p className="text-muted-foreground">
            The interaction protocol is injected into agent system prompts. Changes apply to all new conversations.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-40" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-medium">Failed to load protocol</p>
              <p className="text-muted-foreground mt-1 text-sm">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Protocol Editor */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Protocol Editor</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">v{protocol?.version ?? 1}</Badge>
                    <Badge variant={protocol?.active ? "default" : "destructive"}>
                      {protocol?.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-4">
                  {protocol?.updated_at && (
                    <span>
                      Last updated:{" "}
                      {new Date(protocol.updated_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                  <span className="text-muted-foreground">~{tokenEstimate.toLocaleString()} tokens</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={protocolText}
                  onChange={(e) => setProtocolText(e.target.value)}
                  rows={16}
                  className="font-mono text-sm"
                  placeholder="Enter the interaction protocol text..."
                />
              </CardContent>
            </Card>

            {/* Agent Assignment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Apply Protocol To</CardTitle>
                <CardDescription>
                  Choose which agents receive this interaction protocol in their system prompt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAssignMode("all")}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      assignMode === "all"
                        ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "h-3 w-3 rounded-full border-2",
                        assignMode === "all" ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40",
                      )} />
                      <span className="text-sm font-semibold">All Agents</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Protocol is injected into every agent's system prompt
                    </p>
                  </button>

                  <button
                    onClick={() => setAssignMode("selected")}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      assignMode === "selected"
                        ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "h-3 w-3 rounded-full border-2",
                        assignMode === "selected" ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40",
                      )} />
                      <span className="text-sm font-semibold">Selected Agents</span>
                      {assignMode === "selected" && selectedAgentIds.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedAgentIds.length} selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only selected agents receive the protocol
                    </p>
                  </button>
                </div>

                {assignMode === "selected" && (
                  <div className="border rounded-lg p-4 space-y-3">
                    {domains.map((domain) => {
                      const domainAgents = AGENT_VOICE_CONFIG.filter((a) => a.domain === domain)
                      const allChecked = domainAgents.every((a) => selectedAgentIds.includes(a.id))
                      const someChecked = domainAgents.some((a) => selectedAgentIds.includes(a.id))
                      return (
                        <div key={domain}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                              onChange={() => selectAllInDomain(domain)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm font-semibold capitalize">{domain}</span>
                            <Badge variant="secondary" className={cn("text-[10px]", getDomainColor(domain))}>
                              {domainAgents.filter((a) => selectedAgentIds.includes(a.id)).length}/{domainAgents.length}
                            </Badge>
                          </div>
                          <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {domainAgents.map((agent) => (
                              <label key={agent.id} className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-slate-50 rounded px-1.5 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedAgentIds.includes(agent.id)}
                                  onChange={() => toggleAgent(agent.id)}
                                  className="rounded border-gray-300"
                                />
                                <span>{agent.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  {protocolText.length.toLocaleString()} characters
                  {assignMode === "selected" && selectedAgentIds.length > 0 && (
                    <> &middot; {selectedAgentIds.length} agent{selectedAgentIds.length !== 1 ? "s" : ""} selected</>
                  )}
                </p>
                <Button onClick={handleSave} disabled={saving || !isDirty}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Protocol"}
                </Button>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </SuperAdminLayout>
  )
}
