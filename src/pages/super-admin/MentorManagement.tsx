import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bot,
  Save,
  ScrollText,
  Wand2,
  Settings2,
  Volume2,
  Search,
  ChevronRight,
  Mic,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import PromptWizardForm from "@/components/super-admin/prompt-builder/PromptWizardForm"
import PromptPreviewPanel from "@/components/super-admin/prompt-builder/PromptPreviewPanel"
import PromptVersionHistory from "@/components/super-admin/prompt-builder/PromptVersionHistory"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { useSavePrompt, useUpdatePrompt, usePromptVersions } from "@/hooks/prompt-builder/usePromptBuilder"
import {
  getInteractionProtocol,
  updateInteractionProtocol,
  type InteractionProtocol as ProtocolData,
} from "@/services/agent/protocolService"
import {
  AGENT_VOICE_CONFIG,
  getDomainColor,
  getGenderLabel,
  getProviderColor,
  getVoiceById,
  ALL_PROVIDERS,
  VOICES_BY_PROVIDER,
  VOICE_PROVIDER_LABELS,
  type AgentVoiceDef,
  type VoiceMode,
  type VoiceOption,
} from "@/constants/agentVoiceConfig"
import type { SystemPrompt } from "@/types/prompt-builder"

// ---------------------------------------------------------------------------
// Agent Sidebar
// ---------------------------------------------------------------------------

function AgentSidebar({
  agents,
  selectedId,
  onSelect,
}: {
  agents: AgentVoiceDef[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [domainFilter, setDomainFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    let list = agents
    if (domainFilter !== "all") {
      list = list.filter((a) => a.domain === domainFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    }
    return list
  }, [agents, search, domainFilter])

  const domains = ["all", "coaching", "business", "system", "career"]

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {domains.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">
                {d === "all" ? "All Domains" : d.charAt(0).toUpperCase() + d.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={cn(
              "w-full text-left px-3 py-2.5 border-b transition-colors flex items-center gap-2",
              selectedId === agent.id
                ? "bg-slate-100 border-l-2 border-l-blue-500"
                : "hover:bg-slate-50 border-l-2 border-l-transparent",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{agent.name}</span>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", getDomainColor(agent.domain))}>
                  {agent.domain}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{agent.description}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No agents match your filter.</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agent Settings Tab
// ---------------------------------------------------------------------------

const LLM_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "google", label: "Google (Gemini)" },
]

const MODEL_TIERS = [
  { value: "Sonnet", label: "Sonnet — balanced speed & quality" },
  { value: "Haiku", label: "Haiku — fastest, lightweight tasks" },
  { value: "Nova", label: "Nova — general purpose" },
  { value: "Opus", label: "Opus — highest quality, complex reasoning" },
]

function AgentSettingsTab({ agent, coachData }: { agent: AgentVoiceDef; coachData?: Record<string, unknown> }) {
  const [modelTier, setModelTier] = useState<string>(agent.modelTier)
  const [llmProvider, setLlmProvider] = useState((coachData?.llm_provider as string) || "anthropic")
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Sync when agent changes
  useEffect(() => {
    setModelTier((coachData?.model_tier as string) || agent.modelTier)
    setLlmProvider((coachData?.llm_provider as string) || "anthropic")
    setDirty(false)
  }, [agent.id, coachData])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const { updateCoach } = await import("@/services/super-admin/coachManagementService")
      await updateCoach({ agent_id: agent.id, model_tier: modelTier, llm_provider: llmProvider })
      toast.success(`${agent.name} settings updated`)
      setDirty(false)
    } catch (e) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Agent Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Name</span>
              <p className="text-sm font-medium">{agent.name}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">ID</span>
              <p className="text-sm font-mono text-muted-foreground">{agent.id}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Domain</span>
              <div className="mt-0.5">
                <Badge variant="secondary" className={cn("text-xs", getDomainColor(agent.domain))}>
                  {agent.domain}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Gender</span>
              <p className="text-sm">{getGenderLabel(agent.gender)}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Description</span>
              <p className="text-sm">{agent.description}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    (coachData?.status as string)?.toLowerCase() === "deactivated"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  {(coachData?.status as string)?.toLowerCase() === "deactivated" ? "Inactive" : "Active"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LLM & Model Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">LLM Configuration</CardTitle>
          <CardDescription>Select the language model provider and tier for this agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">LLM Provider</span>
              <Select value={llmProvider} onValueChange={(v) => { setLlmProvider(v); setDirty(true) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Model Tier</span>
              <Select value={modelTier} onValueChange={(v) => { setModelTier(v); setDirty(true) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button onClick={handleSaveSettings} size="sm" className="ml-auto gap-2" disabled={!dirty || saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>

      {(() => {
        const prompts = coachData?.prompts as Array<{ text: string }> | undefined
        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) return null
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/40 rounded-lg p-3 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {prompts[0]?.text || "No prompt configured"}
              </pre>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prompt Builder Tab (embedded from PromptBuilder page)
// ---------------------------------------------------------------------------

function PromptBuilderTab({ coachId }: { coachId: string }) {
  const [promptId, setPromptId] = useState<string | undefined>(undefined)
  const [isHistorical, setIsHistorical] = useState(false)
  const [persona, setPersona] = useState("")
  const [tone, setTone] = useState("")
  const [knowledgeDomain, setKnowledgeDomain] = useState("")
  const [responseStyle, setResponseStyle] = useState("")
  const [constraints, setConstraints] = useState("")

  const { data: versionsData, isLoading: versionsLoading, isError: versionsError } = usePromptVersions(coachId)
  const versions = useMemo(() => versionsData?.data?.versions ?? [], [versionsData])

  const saveMutation = useSavePrompt()
  const updateMutation = useUpdatePrompt()

  // Reset when coachId changes
  useEffect(() => {
    setPromptId(undefined)
    setPersona("")
    setTone("")
    setKnowledgeDomain("")
    setResponseStyle("")
    setConstraints("")
    setIsHistorical(false)
  }, [coachId])

  // Auto-load latest version
  useEffect(() => {
    if (!coachId || versionsLoading) return
    if (versions.length > 0 && !promptId) {
      handleSelectVersion(versions[0])
    }
  }, [versions, versionsLoading, coachId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectVersion = (prompt: SystemPrompt) => {
    setPromptId(prompt.id)
    setPersona(prompt.persona)
    setTone(prompt.tone)
    setKnowledgeDomain(prompt.knowledge_domain)
    setResponseStyle(prompt.response_style)
    setConstraints(prompt.constraints)
    setIsHistorical(versions.length > 0 && prompt.id !== versions[0]?.id)
  }

  const handleSave = async () => {
    if (!coachId) return
    const payload = {
      coach_id: coachId,
      persona,
      tone,
      knowledge_domain: knowledgeDomain,
      response_style: responseStyle,
      constraints,
    }
    try {
      if (promptId) {
        await updateMutation.mutateAsync({ id: promptId, payload })
      } else {
        const resp = await saveMutation.mutateAsync(payload)
        if (resp?.data?.id) setPromptId(resp.data.id)
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to save prompt"
      toast.error(msg)
    }
  }

  const isSaving = saveMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {isHistorical && (
          <Button variant="outline" onClick={handleSave} disabled={isSaving} className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50" size="sm">
            Rollback to This Version
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
          <Save className="size-4" />
          {isSaving ? "Saving..." : "Save Prompt"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          <PromptWizardForm
            persona={persona}
            tone={tone}
            knowledgeDomain={knowledgeDomain}
            responseStyle={responseStyle}
            constraints={constraints}
            onPersonaChange={setPersona}
            onToneChange={setTone}
            onKnowledgeDomainChange={setKnowledgeDomain}
            onResponseStyleChange={setResponseStyle}
            onConstraintsChange={setConstraints}
          />
          {versionsError && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Could not load prompt versions from the server. You can still create a new prompt.
            </div>
          )}
          {!versionsLoading && !versionsError && versions.length === 0 && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              No prompt versions found. Fill in the fields and click "Save Prompt" to create the first version.
            </div>
          )}
          <PromptVersionHistory versions={versions} isLoading={versionsLoading} onSelectVersion={handleSelectVersion} />
        </div>
        <div className="space-y-4">
          <PromptPreviewPanel persona={persona} tone={tone} knowledgeDomain={knowledgeDomain} responseStyle={responseStyle} constraints={constraints} />
          <PromptTestPanel coachId={coachId} persona={persona} tone={tone} knowledgeDomain={knowledgeDomain} responseStyle={responseStyle} constraints={constraints} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prompt Test Panel
// ---------------------------------------------------------------------------

function PromptTestPanel({
  coachId,
  persona,
  tone,
  knowledgeDomain,
  responseStyle,
  constraints,
}: {
  coachId: string
  persona: string
  tone: string
  knowledgeDomain: string
  responseStyle: string
  constraints: string
}) {
  const [testMessage, setTestMessage] = useState("")
  const [testResult, setTestResult] = useState("")
  const [testing, setTesting] = useState(false)
  const [testAgent, setTestAgent] = useState("")

  const handleTest = async () => {
    if (!testMessage.trim()) {
      toast.error("Enter a test message")
      return
    }
    setTesting(true)
    setTestResult("")
    try {
      const { assembleTemplateText } = await import("@/services/prompt-builder/prompt-builder.service")
      const { testPrompt } = await import("@/services/super-admin/coachManagementService")
      const assembled = assembleTemplateText({ coach_id: coachId, persona, tone, knowledge_domain: knowledgeDomain, response_style: responseStyle, constraints })
      const resp = await testPrompt(coachId, testMessage, assembled)
      setTestResult(resp.content)
      setTestAgent(resp.agent)
    } catch (e) {
      const msg = (e as Error)?.message || "Test failed"
      setTestResult(`Error: ${msg}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Test Prompt</CardTitle>
        <CardDescription>Send a test message using the current prompt to see how the agent responds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Type a test message... (e.g., 'Hello, how can you help me?')"
            rows={2}
            className="flex-1 text-sm"
          />
          <Button onClick={handleTest} disabled={testing || !testMessage.trim()} size="sm" className="self-end gap-1.5">
            {testing ? "Testing..." : "Send Test"}
          </Button>
        </div>
        {testResult && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            {testAgent && (
              <div className="flex items-center gap-1.5 mb-2">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{testAgent}</span>
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{testResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Interaction Protocol Tab (embedded from InteractionProtocol page)
// ---------------------------------------------------------------------------

function InteractionProtocolTab() {
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
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
        // Deselect all in domain
        return prev.filter((id) => !domainAgents.includes(id))
      }
      // Select all in domain
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

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">Failed to load protocol</p>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const domains = ["coaching", "business", "system", "career"] as const

  return (
    <div className="space-y-4">
      {/* Protocol Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Protocol Editor</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{protocol?.version ?? 1}</Badge>
              <Badge variant={protocol?.active ? "default" : "destructive"}>
                {protocol?.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <CardDescription className="flex items-center gap-4">
            {protocol?.updated_at && (
              <span>Last updated: {new Date(protocol.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
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
          {/* Mode Toggle */}
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

          {/* Agent Checkboxes (only when "selected" mode) */}
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
          <Button onClick={handleSave} disabled={saving || !isDirty} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Protocol"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Voice Config Tab (per-agent)
// ---------------------------------------------------------------------------

function VoicePreview({ voice }: { voice: VoiceOption | undefined }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePreview = async () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    setPlaying(true)
    try {
      const { getApi } = await import("@/lib/agentApi")
      const api = getApi()
      // Strip provider prefix for the synthesize endpoint
      const voiceName = voice!.id.includes("-") ? voice!.id.split("-").slice(1).join("-") : voice!.id
      const resp = await api.post(
        "/v1/agents/voice/synthesize",
        { text: `Hello, I'm ${voice!.name}. I'll be your AI coaching assistant today.`, voice: voiceName },
        { responseType: "blob" },
      )
      const url = URL.createObjectURL(resp.data)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url) }
      audio.onerror = () => {
        setPlaying(false)
        // Fallback to browser speech synthesis
        if ("speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(`Hello, I'm ${voice!.name}. I'll be your AI coaching assistant today.`)
          u.onend = () => setPlaying(false)
          window.speechSynthesis.speak(u)
        } else {
          toast.error("Voice preview unavailable")
        }
      }
      await audio.play()
    } catch {
      // Fallback to browser speech synthesis
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(`Hello, I'm ${voice!.name}. I'll be your AI coaching assistant today.`)
        u.onend = () => setPlaying(false)
        window.speechSynthesis.speak(u)
      } else {
        setPlaying(false)
        toast.error("Voice preview unavailable")
      }
    }
  }

  if (!voice) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Select a voice to see details
      </div>
    )
  }
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">{voice.name}</p>
          <Button variant="outline" size="sm" onClick={handlePreview} className="gap-1.5 h-7">
            <Volume2 className="h-3.5 w-3.5" />
            {playing ? "Stop" : "Preview"}
          </Button>
        </div>
        <Badge variant="secondary" className={cn("text-xs", getProviderColor(voice.provider))}>
          {VOICE_PROVIDER_LABELS[voice.provider]}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{voice.description}</p>
      {voice.gender && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Gender:</span>
          <span className="font-medium capitalize">{voice.gender}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Voice ID:</span>
        <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{voice.id}</code>
      </div>
    </div>
  )
}

function VoiceSelector({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (voiceId: string) => void
  label?: string
}) {
  return (
    <div className="space-y-1.5">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a voice..." />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {ALL_PROVIDERS.map((provider) => {
            const voices = VOICES_BY_PROVIDER[provider]
            return (
              <SelectGroup key={provider}>
                <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {VOICE_PROVIDER_LABELS[provider]}
                </SelectLabel>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm">
                    <span className="font-medium">{v.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{v.description}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

function VoiceConfigTab({ agent }: { agent: AgentVoiceDef }) {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("monolith")

  // Track voice assignments per agent (local state; persisted on save)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const a of AGENT_VOICE_CONFIG) {
      map[a.id] = a.voiceId
    }
    return map
  })

  const meridian = AGENT_VOICE_CONFIG.find((a) => a.id === "meridian-001")!
  const currentVoiceId = voiceMode === "ecosystem" ? assignments[meridian.id] : assignments[agent.id]
  const currentVoice = getVoiceById(currentVoiceId)

  const handleVoiceChange = (voiceId: string) => {
    const targetId = voiceMode === "ecosystem" ? meridian.id : agent.id
    setAssignments((prev) => ({ ...prev, [targetId]: voiceId }))
  }

  const [voiceSaving, setVoiceSaving] = useState(false)

  const handleSave = async () => {
    setVoiceSaving(true)
    try {
      const { updateCoach } = await import("@/services/super-admin/coachManagementService")
      const targetId = voiceMode === "ecosystem" ? meridian.id : agent.id
      const voiceId = assignments[targetId]
      await updateCoach({ agent_id: targetId, voice_id: voiceId })
      toast.success(
        voiceMode === "ecosystem"
          ? `Meridian voice updated to ${getVoiceById(voiceId)?.name ?? "unknown"}`
          : `${agent.name} voice updated to ${getVoiceById(voiceId)?.name ?? "unknown"}`,
      )
    } catch {
      toast.error("Failed to save voice configuration")
    } finally {
      setVoiceSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Voice Operating Mode</CardTitle>
          </div>
          <CardDescription>
            Choose how agents use voice in the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVoiceMode("monolith")}
              className={cn(
                "rounded-lg border-2 p-4 text-left transition-all",
                voiceMode === "monolith"
                  ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200"
                  : "border-muted hover:border-muted-foreground/30",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn(
                  "h-3 w-3 rounded-full border-2",
                  voiceMode === "monolith" ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40",
                )} />
                <span className="text-sm font-semibold">Monolith Mode</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All agents speak individually. Each agent can have a different voice from any provider.
              </p>
            </button>

            <button
              onClick={() => setVoiceMode("ecosystem")}
              className={cn(
                "rounded-lg border-2 p-4 text-left transition-all",
                voiceMode === "ecosystem"
                  ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200"
                  : "border-muted hover:border-muted-foreground/30",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn(
                  "h-3 w-3 rounded-full border-2",
                  voiceMode === "ecosystem" ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40",
                )} />
                <span className="text-sm font-semibold">Agent Ecosystem Mode</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only Meridian speaks. All other agents route their output through the unified Meridian persona.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {voiceMode === "ecosystem"
                  ? "Meridian Voice Configuration"
                  : `Voice Assignment for ${agent.name}`}
              </CardTitle>
              <CardDescription className="mt-1">
                {voiceMode === "ecosystem"
                  ? "Select the voice for the unified Meridian persona. All agent output will use this voice."
                  : `Choose a voice for ${agent.name} from any supported provider.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <VoiceSelector
            value={currentVoiceId}
            onChange={handleVoiceChange}
            label="Assigned Voice"
          />

          {/* Preview */}
          <VoicePreview voice={currentVoice} />
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button onClick={handleSave} size="sm" className="ml-auto gap-2" disabled={voiceSaving}>
            <Save className="h-4 w-4" />
            {voiceSaving ? "Saving..." : "Save Voice Config"}
          </Button>
        </CardFooter>
      </Card>

      {/* All Agent Voice Assignments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Agent Voice Assignments</CardTitle>
          <CardDescription>
            {voiceMode === "ecosystem"
              ? "In ecosystem mode, only Meridian's voice is active. Other agents are shown for reference."
              : "Voice mapping for all 18 agents across all providers"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Domain</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Gender</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Voice</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {AGENT_VOICE_CONFIG.map((a) => {
                  const assignedVoice = getVoiceById(assignments[a.id])
                  const isActive = voiceMode === "monolith" || a.id === "meridian-001"
                  const isSelected = a.id === (voiceMode === "ecosystem" ? "meridian-001" : agent.id)
                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        isSelected && "bg-blue-50",
                        voiceMode === "ecosystem" && !isActive && "opacity-40",
                      )}
                    >
                      <td className="py-2 pr-3 font-medium">{a.name}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className={cn("text-[10px]", getDomainColor(a.domain))}>{a.domain}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{getGenderLabel(a.gender)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{assignedVoice?.name ?? a.pollyVoice}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className={cn("text-[10px]", getProviderColor(assignedVoice?.provider ?? "aws_polly"))}>
                          {VOICE_PROVIDER_LABELS[assignedVoice?.provider ?? "aws_polly"]}
                        </Badge>
                      </td>
                      <td className="py-2"><Badge variant="outline" className="text-[10px]">{a.modelTier}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MentorManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedAgentId, setSelectedAgentId] = useState(searchParams.get("agent") || AGENT_VOICE_CONFIG[0].id)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "settings")

  const selectedAgent = AGENT_VOICE_CONFIG.find((a) => a.id === selectedAgentId) ?? AGENT_VOICE_CONFIG[0]

  // Fetch coaches for matching backend data
  const { data: coachesData } = useCoachesList({ page: 1, limit: 100 })
  const coachMap = useMemo(() => {
    const d = coachesData?.data
    const list = Array.isArray(d) ? d : d?.agents ?? []
    const map = new Map<string, Record<string, unknown>>()
    for (const c of list as Array<Record<string, unknown>>) {
      map.set(c.id as string, c)
    }
    return map
  }, [coachesData])

  const handleAgentSelect = (id: string) => {
    setSelectedAgentId(id)
    setSearchParams({ agent: id, tab: activeTab })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSearchParams({ agent: selectedAgentId, tab })
  }

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left sidebar — agent list */}
        <div className="w-72 shrink-0">
          <AgentSidebar agents={AGENT_VOICE_CONFIG} selectedId={selectedAgentId} onSelect={handleAgentSelect} />
        </div>

        {/* Right content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100">
                <Bot className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{selectedAgent.name}</h1>
                <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-xs", getDomainColor(selectedAgent.domain))}>
                  {selectedAgent.domain}
                </Badge>
                <Badge variant="outline" className="text-xs">{selectedAgent.modelTier}</Badge>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="settings" className="gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="prompt" className="gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" />
                  Prompt Builder
                </TabsTrigger>
                <TabsTrigger value="protocol" className="gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" />
                  Interaction Protocol
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" />
                  Voice
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="mt-4">
                <AgentSettingsTab agent={selectedAgent} coachData={coachMap.get(selectedAgent.id)} />
              </TabsContent>

              <TabsContent value="prompt" className="mt-4">
                <PromptBuilderTab coachId={selectedAgentId} />
              </TabsContent>

              <TabsContent value="protocol" className="mt-4">
                <InteractionProtocolTab />
              </TabsContent>

              <TabsContent value="voice" className="mt-4">
                <VoiceConfigTab agent={selectedAgent} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
