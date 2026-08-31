import { useMemo, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useTrainerAgents, useEcosystems } from "@/hooks/trainer/useTrainer"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Brain, Search, Settings2, MessageSquare, BookOpen,
  Target, DollarSign, GitBranch, ListChecks, ShieldCheck,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { AgentConfig } from "@/types/trainer"

const DOMAIN_COLORS = { coaching: "bg-blue-100 text-blue-800", business: "bg-green-100 text-green-800", system: "bg-purple-100 text-purple-800" }
const MATURITY_NAMES = ["Seed", "Sprout", "Growing", "Mature", "Expert"]

/** The per-agent options each tile exposes. Segments match the routes
 *  registered in routes.tsx under /super-admin/agent-trainer/:agentId/*. */
const AGENT_TILE_ACTIONS = [
  { segment: "prompt", label: "Prompt", icon: Settings2, hint: "Prompt Studio — system prompt, versions, A/B" },
  { segment: "knowledge", label: "Knowledge", icon: BookOpen, hint: "Knowledge Manager — sources, uploads, coverage" },
  { segment: "test", label: "Test", icon: MessageSquare, hint: "Conversation Simulator — try prompts against the agent" },
  { segment: "training", label: "Training", icon: Target, hint: "Training Plans — goals, progress, maturity" },
  { segment: "costs", label: "Costs", icon: DollarSign, hint: "Cost & ROI for this agent" },
] as const

/** Trainer tools that are not scoped to a single agent. Routes for all three
 *  already existed; none of them was reachable from anywhere in the UI —
 *  Workflows only via the Process Builder nav item, and Executions/Approvals
 *  from no link at all. */
const TRAINER_TOOLS = [
  {
    to: "/super-admin/agent-trainer/workflows",
    label: "Workflow Designer",
    icon: GitBranch,
    blurb: "Compose multi-agent DAG plans on a canvas and save them as templates.",
  },
  {
    to: "/super-admin/agent-trainer/executions",
    label: "Executions",
    icon: ListChecks,
    blurb: "History of workflow runs, with per-step traces, latency and cost.",
  },
  {
    to: "/super-admin/agent-trainer/approvals",
    label: "Approvals",
    icon: ShieldCheck,
    blurb: "Human-in-the-loop queue for steps a workflow paused on.",
  },
] as const

function MaturityRing({ level }: { level: number }) {
  const pct = (level / 5) * 100
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={level >= 4 ? "#22c55e" : level >= 2 ? "#eab308" : "#9ca3af"} strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{level}</span>
    </div>
  )
}

export default function AgentTrainerDashboard() {
  const [ecosystem, setEcosystem] = useState("inspire-genius")
  const [domainFilter, setDomainFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  const { data: ecosystemsResp } = useEcosystems()
  const { data: agentsResp, isLoading: trainerLoading } = useTrainerAgents(ecosystem)

  // Fallback: if trainer API fails (404), use the coaches list instead
  const { data: coachesData, isLoading: coachesLoading } = useCoachesList({ page: 1, limit: 100 })

  const ecosystems = (ecosystemsResp as any)?.data ?? []

  // GET /v1/trainer/agents returns each row keyed `id` (trainer-service
  // routes/agents.py), but AgentConfig — and every link on this page — reads
  // `agent_id`. Passing the payload through raw made `agent.agent_id`
  // undefined, so every card rendered with key={undefined} and every button
  // navigated to /super-admin/agent-trainer/undefined/... . Confirmed live on
  // stable before this fix. The coaches fallback below already mapped the id
  // correctly, which is why the tiles only worked when the trainer API
  // returned nothing.
  const normalizeAgent = (a: Record<string, unknown>): AgentConfig =>
    ({
      ...a,
      agent_id: (a.agent_id ?? a.id) as string,
    }) as AgentConfig

  const agents: AgentConfig[] = useMemo(() => {
    // Try trainer agents first
    const d = (agentsResp as any)?.data
    if (Array.isArray(d) && d.length > 0) return d.map(normalizeAgent)
    if (d?.agents && Array.isArray(d.agents) && d.agents.length > 0) {
      return d.agents.map(normalizeAgent)
    }

    // Fallback to coaches list (agent-settings API)
    const cd = coachesData?.data
    const coachList = Array.isArray(cd) ? cd : (cd as { agents?: unknown[] })?.agents
    if (Array.isArray(coachList) && coachList.length > 0) {
      return (coachList as Array<Record<string, unknown>>).map((c) => ({
        agent_id: c.id as string,
        name: c.name as string,
        domain: (c.category_name as string) || "coaching",
        role_subtitle: (c.category_name as string) || "",
        maturity_level: 1,
        status: (c.status as string) || "active",
      })) as AgentConfig[]
    }

    return []
  }, [agentsResp, coachesData])

  // Skeletons only while there is genuinely nothing to show.
  //
  // `trainerLoading && coachesLoading` let the grid paint "No agents found"
  // over requests still in flight; plain `||` was worse — it blocked the grid
  // on the FALLBACK query even after the primary had already returned agents.
  // What the operator cares about is whether there is anything to render yet.
  const isLoading = (trainerLoading || coachesLoading) && agents.length === 0

  const filtered = agents.filter(a => {
    if (a.status?.toLowerCase() === "deactivated") return false
    if (domainFilter !== "all" && a.domain !== domainFilter) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6" /> Agent Trainer</h1>
            <p className="text-muted-foreground">Train, test, and manage AI agent expertise</p>
          </div>
          <Select value={ecosystem} onValueChange={setEcosystem}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Ecosystem" /></SelectTrigger>
            <SelectContent>
              {ecosystems.length > 0 ? (
                ecosystems.map((e: any) => <SelectItem key={e.ecosystem_id} value={e.ecosystem_id}>{e.ecosystem_name}</SelectItem>)
              ) : (
                <SelectItem value="inspire-genius">Inspire Genius</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {["all", "coaching", "business", "system"].map(d => (
            <Button key={d} variant={domainFilter === d ? "default" : "outline"} size="sm" onClick={() => setDomainFilter(d)} className="capitalize">{d}</Button>
          ))}
        </div>

        {!isLoading && agents.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">How to train agents</h3>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Select an agent card below to open the training dashboard</li>
              <li>Use <strong>Prompt Studio</strong> to refine the agent's system prompt and personality</li>
              <li>Upload domain knowledge via <strong>Knowledge Manager</strong></li>
              <li>Test conversations in the <strong>Conversation Simulator</strong></li>
              <li>Review training metrics in <strong>Training Plans</strong> to track agent maturity</li>
            </ol>
          </div>
        )}

        {/* Process Builder used to be its own nav item that only redirected
            here (/super-admin/agent-trainer/workflows). Surfacing the three
            non-agent-scoped tools on this page is what lets that duplicate
            nav entry go away without losing any destination. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TRAINER_TOOLS.map(tool => (
            <Card
              key={tool.to}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(tool.to)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <tool.icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{tool.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tool.blurb}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(agent => (
              <Card key={agent.agent_id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(`/super-admin/agent-trainer/${agent.agent_id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MaturityRing level={agent.maturity_level || 1} />
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{agent.role_subtitle || agent.domain}</p>
                      </div>
                    </div>
                    <Badge className={DOMAIN_COLORS[agent.domain as keyof typeof DOMAIN_COLORS] || "bg-gray-100"}>{agent.domain}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">{MATURITY_NAMES[(agent.maturity_level || 1) - 1]}</span>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-[10px]">{agent.status || "active"}</Badge>
                  </div>
                  {/*
                    Three flex-1 buttons in a ~249px card overflowed to 283px,
                    so the third option was clipped at the card edge — the
                    "tiles don't display their options" report. A 2-col grid
                    wraps instead of overflowing, and exposes the two routes
                    (`/training`, `/costs`) that already existed but had no
                    entry point anywhere in the UI — including Training Plans,
                    which the help panel above tells the operator to use.
                  */}
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {AGENT_TILE_ACTIONS.map(action => (
                      <Button
                        key={action.segment}
                        size="sm"
                        variant="ghost"
                        title={action.hint}
                        className="justify-start text-xs px-2 min-w-0"
                        onClick={e => {
                          e.stopPropagation()
                          navigate(`/super-admin/agent-trainer/${agent.agent_id}/${action.segment}`)
                        }}
                      >
                        <action.icon className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && !isLoading && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-lg font-semibold mb-2">No agents found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    {search || domainFilter !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "No agents are configured for this ecosystem yet."}
                  </p>
                  {(search || domainFilter !== "all") && (
                    <Button variant="outline" size="sm" onClick={() => { setSearch(""); setDomainFilter("all"); }}>
                      Clear filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}
