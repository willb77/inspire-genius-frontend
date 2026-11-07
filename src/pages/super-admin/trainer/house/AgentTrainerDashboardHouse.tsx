import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useTrainerAgents, useEcosystems } from "@/hooks/trainer/useTrainer"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { ROUTES } from "@/constants/routes"
import type { AgentConfig } from "@/types/trainer"
import { AGENT_TILE_ACTIONS, TRAINER_TOOLS } from "../trainerActions"

const MATURITY_NAMES = ["Seed", "Sprout", "Growing", "Mature", "Expert"]
const DOMAINS = ["all", "coaching", "business", "system"] as const

type Ecosystem = { ecosystem_id: string; ecosystem_name: string }

/** Same id mapping as the classic page: trainer rows are keyed `id`, links read `agent_id`. */
function normalizeAgent(a: Record<string, unknown>): AgentConfig {
  return { ...a, agent_id: (a.agent_id ?? a.id) as string } as AgentConfig
}

/** Trainer agents first; the coaches list is the fallback, as on the classic page. */
function pickAgents(agentsResp: unknown, coachesData: unknown): AgentConfig[] {
  const d = (agentsResp as { data?: unknown } | undefined)?.data
  if (Array.isArray(d) && d.length > 0) return d.map(normalizeAgent)
  const nested = (d as { agents?: unknown } | undefined)?.agents
  if (Array.isArray(nested) && nested.length > 0) return nested.map(normalizeAgent)

  const cd = (coachesData as { data?: unknown } | undefined)?.data
  const coachList = Array.isArray(cd) ? cd : (cd as { agents?: unknown[] } | undefined)?.agents
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
}

function MaturityRing({ level }: { level: number }) {
  const pct = (level / 5) * 100
  return (
    <div className="relative h-12 w-12" aria-label={`Maturity ${level} of 5`} role="img">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeDasharray={`${pct} ${100 - pct}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{level}</span>
    </div>
  )
}

/**
 * House-style Agent Trainer (admin switch). Same queries, same filters, same
 * destinations. The one behaviour that goes: clicking a coach's card used to
 * navigate to /agent-trainer/:id, which renders this same list — so it looked
 * like nothing happened. Cards are no longer clickable; the five buttons on
 * each card (unchanged) are how you open a coach's prompt, knowledge, test,
 * training or costs.
 */
export default function AgentTrainerDashboardHouse() {
  const [ecosystem, setEcosystem] = useState("inspire-genius")
  const [domainFilter, setDomainFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const { data: ecosystemsResp } = useEcosystems()
  const agentsQ = useTrainerAgents(ecosystem)
  const coachesQ = useCoachesList({ page: 1, limit: 100 })

  const ecosystems: Ecosystem[] = (ecosystemsResp as { data?: Ecosystem[] } | undefined)?.data ?? []
  const agents = useMemo(() => pickAgents(agentsQ.data, coachesQ.data), [agentsQ.data, coachesQ.data])

  const isLoading = (agentsQ.isLoading || coachesQ.isLoading) && agents.length === 0
  // Only an error when BOTH sources failed; one failing is what the fallback is for.
  const isError = agentsQ.isError && coachesQ.isError && agents.length === 0

  const filtered = agents.filter((a) => {
    if (a.status?.toLowerCase() === "deactivated") return false
    if (domainFilter !== "all" && a.domain !== domainFilter) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const filtering = search !== "" || domainFilter !== "all"

  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <PageHeader
          title="Agent Trainer"
          description="Choose a coach, then what to work on: its prompt, knowledge, a test conversation, training or costs."
          action={
            <Select value={ecosystem} onValueChange={setEcosystem}>
              <SelectTrigger className="w-[220px]" aria-label="Ecosystem">
                <SelectValue placeholder="Ecosystem" />
              </SelectTrigger>
              <SelectContent>
                {ecosystems.length > 0 ? (
                  ecosystems.map((e) => (
                    <SelectItem key={e.ecosystem_id} value={e.ecosystem_id}>
                      {e.ecosystem_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="inspire-genius">Inspire Genius</SelectItem>
                )}
              </SelectContent>
            </Select>
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TRAINER_TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <tool.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{tool.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{tool.blurb}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search coaches..."
              aria-label="Search coaches"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {DOMAINS.map((d) => (
            <Button
              key={d}
              variant={domainFilter === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDomainFilter(d)}
              className="capitalize"
            >
              {d}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <PageState kind="loading" rows={4} />
        ) : isError ? (
          <PageState
            kind="error"
            message="We couldn't load the coaches."
            onRetry={() => {
              void agentsQ.refetch()
              void coachesQ.refetch()
            }}
          />
        ) : filtered.length === 0 ? (
          <PageState
            kind="empty"
            title="No coaches found"
            message={filtering ? "Try a different search or filter." : "No coaches are set up for this ecosystem yet."}
            action={
              filtering ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setDomainFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((agent) => (
              <Card key={agent.agent_id} data-testid={`coach-card-${agent.agent_id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MaturityRing level={agent.maturity_level || 1} />
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{agent.role_subtitle || agent.domain}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {agent.domain}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{MATURITY_NAMES[(agent.maturity_level || 1) - 1]}</span>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-xs">
                      {agent.status || "active"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {AGENT_TILE_ACTIONS.map((action) => (
                      <Button
                        key={action.segment}
                        size="sm"
                        variant="ghost"
                        title={action.hint}
                        className="min-w-0 justify-start px-2 text-xs"
                        asChild
                      >
                        <Link to={`${ROUTES.SUPER_ADMIN.AGENT_TRAINER}/${agent.agent_id}/${action.segment}`}>
                          <action.icon className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{action.label}</span>
                        </Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}
