import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { AGENT_VOICE_CONFIG, getDomainColor } from "@/constants/agentVoiceConfig"

export type PlatformAgentRow = { id: string; status?: string }

/** Where an agent's row links: its settings tab on the coach setup page. */
function agentSettingsPath(agentId: string): string {
  return `${ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT}?agent=${agentId}&tab=settings`
}

/**
 * Every platform agent, joined to its backend status. Shared by the classic
 * super-admin dashboard and the house-style admin home, so both list the same
 * agents with the same status and the same settings link.
 */
export function PlatformAgentsTable({ coaches }: { coaches: PlatformAgentRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Domain</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Voice</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {AGENT_VOICE_CONFIG.map((agent) => {
          const backendAgent = coaches.find((c) => c.id === agent.id)
          const isActive = backendAgent
            ? backendAgent.status?.toLowerCase() !== "deactivated"
            : true
          return (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn("text-xs", getDomainColor(agent.domain))}>
                  {agent.domain}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{agent.description}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{agent.modelTier}</Badge>
              </TableCell>
              <TableCell className="text-sm font-mono text-muted-foreground">{agent.pollyVoice}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="secondary"
                  className={cn(
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600",
                  )}
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <Link to={agentSettingsPath(agent.id)}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
