import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Info, AlertTriangle, Coins, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlatformCost } from "@/hooks/cost-board/usePlatformCost"
import { useOrgCost } from "@/hooks/cost-board/useOrgCost"
import { useDeptCost } from "@/hooks/cost-board/useDeptCost"
import type { CostBoardResult } from "@/hooks/cost-board/usePlatformCost"

export type CostBoardScope = "platform" | "org" | "dept"

export type CostBoardProps = {
  scope: CostBoardScope
  /** Optional scope-id (org_id, dept_id) — passed through to the scope-specific hook. */
  scopeId?: string
  className?: string
}

// This used to blame R-2.4, which closed 2026-05-11. The real reason platform
// spend reads zero is upstream and unrelated: GET /v1/trainer/costs/dashboard
// is a hard-coded stub (`trainer-service/app/routes/costs.py`) that returns
// `total_spend: 0.0` with empty agent/category/trend collections on every
// call — a 200 with no computation behind it. It also returns `total_spend`
// where this panel reads `total_cost`, so even a populated stub would not
// surface here. Naming that is the difference between "we spent nothing" and
// "nothing is adding it up".
const DATA_PENDING_MESSAGE =
  "Platform spend is not being aggregated yet: the cost dashboard endpoint returns a fixed zero rather than a computed total. Treat this panel as not-yet-implemented, not as $0 of spend."

// TODO(R-2.4): remove banner in Wave 3 once telemetry populates.
// See REMAINING_TASKS.md §4 (R-2.4 — Telemetry + audit closure) for the
// gating signal; once the audit/EB pipeline is fully verified end-to-end
// in production, drop `<DataPendingBanner />` from this file.
function DataPendingBanner() {
  return (
    <div
      data-testid="cost-board-data-pending-banner"
      role="status"
      className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2 mb-4"
    >
      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <span className="text-[12px] text-amber-800 font-medium leading-snug">
        {DATA_PENDING_MESSAGE}
      </span>
    </div>
  )
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00"
  if (n >= 10000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

function useCostByScope(scope: CostBoardScope, scopeId?: string): CostBoardResult {
  // Per the contract, each scope dispatches its own hook. Hooks must be
  // called unconditionally, so we call all three and pick the result.
  const platform = usePlatformCost()
  const org = useOrgCost(scope === "org" ? scopeId : undefined)
  const dept = useDeptCost(scope === "dept" ? scopeId : undefined)

  if (scope === "platform") return platform
  if (scope === "org") return org
  return dept
}

export default function CostBoard({ scope, scopeId, className }: CostBoardProps) {
  const { data, hasData, isLoading, error } = useCostByScope(scope, scopeId)

  // `!error` here meant the explanatory banner vanished at exactly the moment
  // it was needed: on a failed request the panel rendered a bare grid of 0 / —
  // / 0.0% with nothing to say the numbers were never fetched. A zero that
  // means "the call failed" is indistinguishable from a genuine quiet day, so
  // the failure is now surfaced in its own right.
  const showBanner = !hasData && !isLoading && !error
  const showError = Boolean(error) && !isLoading

  const scopeLabel =
    scope === "platform" ? "Platform" : scope === "org" ? "Organization" : "Department"

  return (
    <div className={cn("space-y-4", className)} data-testid={`cost-board-${scope}`}>
      {showBanner && <DataPendingBanner />}
      {showError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span className="text-[12px] font-medium leading-snug text-red-800">
            Could not load these figures. The values below are placeholders, not
            measurements — treat them as unknown rather than as zero.
          </span>
        </div>
      )}

      {/* KPI strip — total cost, total tokens, error rate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Coins className="h-4 w-4" />
              {scopeLabel} Cost
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{formatUsd(data.totalCostUsd)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Brain className="h-4 w-4" />
              Total Tokens
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {data.totalTokens.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
        <Card
          className={cn(
            "shadow-sm",
            data.errorRate > 0.05 && !isLoading && "border-destructive"
          )}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="h-4 w-4" />
              Error Rate
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div
                className={cn(
                  "text-2xl font-bold",
                  data.errorRate > 0.05 && "text-destructive"
                )}
              >
                {(data.errorRate * 100).toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost by mentor + Cost by model tier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost by Mentor</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : data.costByMentor.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No mentor cost data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.costByMentor.map((m) => (
                    <TableRow key={m.agent}>
                      <TableCell className="font-medium">{m.agent}</TableCell>
                      <TableCell className="text-right">
                        {m.sessions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatUsd(m.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost by Model Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : data.costByModelTier.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No model-tier cost data yet.</p>
            ) : (
              <div className="space-y-2">
                {data.costByModelTier.map((t) => (
                  <div
                    key={t.tier}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/40"
                  >
                    <Badge variant="outline" className="text-xs">
                      {t.tier?.replace("tier_", "Tier ").replace("_", " ") ?? "Unknown"}
                    </Badge>
                    <span className="font-mono text-sm font-medium">
                      {formatUsd(t.cost)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
