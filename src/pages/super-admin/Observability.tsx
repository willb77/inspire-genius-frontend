import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const [timeRange, setTimeRange] = useState("today")
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
              Real-time transparency into AI agent decisions, costs, and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
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
