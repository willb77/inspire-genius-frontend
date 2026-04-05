import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useTrainerAgents, useEcosystems } from "@/hooks/trainer/useTrainer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Brain, Search, Settings2, MessageSquare, BookOpen } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { AgentConfig } from "@/types/trainer"

const DOMAIN_COLORS = { coaching: "bg-blue-100 text-blue-800", business: "bg-green-100 text-green-800", system: "bg-purple-100 text-purple-800" }
const MATURITY_NAMES = ["Seed", "Sprout", "Growing", "Mature", "Expert"]

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
  const { data: agentsResp, isLoading } = useTrainerAgents(ecosystem)

  const ecosystems = (ecosystemsResp as any)?.data ?? []
  const agents: AgentConfig[] = (agentsResp as any)?.data ?? []

  const filtered = agents.filter(a => {
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
              {ecosystems.map((e: any) => <SelectItem key={e.ecosystem_id} value={e.ecosystem_id}>{e.ecosystem_name}</SelectItem>)}
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
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); navigate(`/super-admin/agent-trainer/${agent.agent_id}/prompt`) }}>
                      <Settings2 className="h-3 w-3 mr-1" /> Prompt
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); navigate(`/super-admin/agent-trainer/${agent.agent_id}/knowledge`) }}>
                      <BookOpen className="h-3 w-3 mr-1" /> Knowledge
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); navigate(`/super-admin/agent-trainer/${agent.agent_id}/test`) }}>
                      <MessageSquare className="h-3 w-3 mr-1" /> Test
                    </Button>
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
