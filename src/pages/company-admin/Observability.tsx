import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { Button } from "@/components/ui/button"
import { Eye, RefreshCw } from "lucide-react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import { cn } from "@/lib/utils"
// Wave 0 Lane 0.I — shared CostBoard panel (P5.2)
import CostBoard from "@/components/super-admin/CostBoard"
// Wave 3 Lane 3.B — shared ObservabilityBoard panel (P7.5)
import ObservabilityBoard from "@/components/super-admin/ObservabilityBoard"

export default function CompanyAdminObservability() {
  const { isLoading, refetch } = useDashboardMetrics()

  return (
    <CompanyAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="h-6 w-6" />
              AI Observability
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Agent performance and cost metrics for your organization
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Shared org observability panel (Wave 3 Lane 3.B — P7.5) */}
        <ObservabilityBoard scope="org" />

        {/* Shared org-spend panel (Wave 0 Lane 0.I — P5.2) */}
        <CostBoard scope="org" />
      </div>
    </CompanyAdminLayout>
  )
}
