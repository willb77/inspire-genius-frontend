import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Eye, RefreshCw } from "lucide-react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import { cn } from "@/lib/utils"
// Combined Plan §A.E3.5 — task-agent observability
import TasksObservabilityTab from "@/components/observability/TasksObservabilityTab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Wave 0 Lane 0.I — shared CostBoard panel (P5.2)
import CostBoard from "@/components/super-admin/CostBoard"
// Wave 3 Lane 3.B — shared ObservabilityBoard panel (P7.5)
import ObservabilityBoard from "@/components/super-admin/ObservabilityBoard"

export default function Observability() {
  const { isLoading, refetch } = useDashboardMetrics()

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="h-6 w-6" />
              Agent Observability
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              What the agent platform did <strong>today</strong> — one row per LLM call,
              aggregated.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/*
              A Today / 7d / 30d Select used to sit here. `timeRange` was
              stored in state and never read again — neither ObservabilityBoard
              nor CostBoard accepts a range, and GET /v1/observability/dashboard
              takes no range parameter. Choosing "Last 30 days" changed nothing
              while strongly implying it had. A control that lies about the
              window on a metrics page is worse than no control, so it is gone
              until the endpoint can actually honour a range; the scope is
              stated in the subtitle instead.
            */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">What this page shows</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <strong>Overview</strong> — today&rsquo;s totals from{" "}
              <code>response_observability</code>, which the agent-engine writes one row
              to per LLM call: responses, average end-to-end latency, distinct users,
              average routing confidence, error rate, and which agents handled the
              traffic. Spend is shown beneath it.
            </li>
            <li>
              <strong>Tasks</strong> — invocations of the five structured task agents
              (Maven, James, Atlas, Forge, Sage), read from the audit log.
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            The window is the current day and is not adjustable here. Figures are
            aggregates only — to inspect an individual conversation and see why a
            particular agent was chosen, use <strong>Explainability</strong>.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TasksObservabilityTab />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Shared platform observability panel (Wave 3 Lane 3.B — P7.5) */}
            <ObservabilityBoard scope="platform" />

            {/* Shared platform spend panel (Wave 0 Lane 0.I — P5.2) */}
            <CostBoard scope="platform" />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
