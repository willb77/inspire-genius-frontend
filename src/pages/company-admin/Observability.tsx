import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import { CompanyAdminHub } from "./house/CompanyAdminHub"
import { ANALYTICS_HUB } from "./house/hubs"
import { Button } from "@/components/ui/button"
import { Eye, RefreshCw } from "lucide-react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import { cn } from "@/lib/utils"
// Wave 0 Lane 0.I — shared CostBoard panel (P5.2)
import CostBoard from "@/components/super-admin/CostBoard"
// Wave 3 Lane 3.B — shared ObservabilityBoard panel (P7.5)
import ObservabilityBoard from "@/components/super-admin/ObservabilityBoard"

/** RM-5: with the company-admin house switch on, this page is the AI Observability tab of the Analytics hub. */
function AnalyticsHubFrame({ children }: { children: ReactNode }) {
  return (
    <CompanyAdminHub hub={ANALYTICS_HUB} active="observability">
      {children}
    </CompanyAdminHub>
  )
}

export default function CompanyAdminObservability() {
  const { t } = useTranslation("companyAdminPages")
  // House style (area `company-admin`): display only. Off, the page renders unchanged.
  const house = isHouseStyleOn("company-admin")
  const Frame = house ? AnalyticsHubFrame : CompanyAdminLayout
  const { isLoading, refetch } = useDashboardMetrics()

  return (
    <Frame>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {house ? (
            // RM-5: inside the Analytics hub, the hub header names the page.
            <span />
          ) : (
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="h-6 w-6" />
              {t("observabilityTitle", { defaultValue: "AI Observability" })}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("observabilitySubtitle", { defaultValue: "Agent performance and cost metrics for your organization" })}
            </p>
          </div>
          )}
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
    </Frame>
  )
}
