import { useParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useAgentCosts, useAgentROI, useBudgetStatus, useAuditLog, useAuditStats } from "@/hooks/trainer/useTrainer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, TrendingDown, Shield, Activity, BarChart3 } from "lucide-react"

export default function CostDashboard() {
  const { agentId } = useParams<{ agentId: string }>()

  const { data: costsResp } = useAgentCosts(agentId || "", 30)
  const { data: roiResp } = useAgentROI(agentId || "")
  const { data: budgetResp } = useBudgetStatus()
  const { data: auditResp } = useAuditLog({ agent_id: agentId, limit: 20 })
  const { data: auditStatsResp } = useAuditStats()

  const costs = (costsResp as any)?.data
  const roi = (roiResp as any)?.data
  const budget = (budgetResp as any)?.data
  const auditEntries = (auditResp as any)?.data ?? []
  const auditStats = (auditStatsResp as any)?.data

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" /> Cost & ROI Dashboard</h1>

        <Tabs defaultValue="costs">
          <TabsList>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="roi">ROI</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="costs" className="space-y-4 mt-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-1">${costs?.total_usd?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-muted-foreground">{costs?.period || "30d"} period</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Cost / Interaction</p>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-1">${costs?.cost_per_interaction?.toFixed(4) || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Budget Utilization</p>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{budget?.utilization_pct?.toFixed(0) || "0"}%</p>
                  <Progress value={budget?.utilization_pct || 0} className="h-2 mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Audit Events</p>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{auditStats?.total_entries || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown */}
            {costs?.by_category && Object.keys(costs.by_category).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Cost by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(costs.by_category).map(([cat, amt]: [string, any]) => (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                        <span className="font-medium">${Number(amt).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="roi" className="space-y-4 mt-4">
            {roi && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">ROI</p>
                      <p className={`text-4xl font-bold mt-2 ${roi.roi_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {roi.roi_percent >= 0 ? "+" : ""}{roi.roi_percent?.toFixed(0)}%
                      </p>
                      {roi.roi_percent >= 0 ? <TrendingUp className="mx-auto mt-2 h-6 w-6 text-green-600" /> : <TrendingDown className="mx-auto mt-2 h-6 w-6 text-red-600" />}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">Total Investment</p>
                      <p className="text-3xl font-bold mt-2">${roi.total_cost?.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">Total Value Generated</p>
                      <p className="text-3xl font-bold mt-2 text-green-600">${roi.total_value?.toFixed(2)}</p>
                      {roi.break_even_days && <p className="text-xs text-muted-foreground mt-1">Break-even: {roi.break_even_days} days</p>}
                    </CardContent>
                  </Card>
                </div>

                {roi.value_breakdown && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Value Attribution</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(roi.value_breakdown).map(([src, val]: [string, any]) => (
                          <div key={src} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{src.replace(/_/g, " ")}</span>
                            <span className="font-medium text-green-600">${Number(val).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-2 mt-4">
            {auditEntries.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="text-xs mr-2">{e.action}</Badge>
                    <span className="text-sm">{e.target_type} {e.target_id?.slice(0, 8)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.actor_email && <span className="mr-2">{e.actor_email}</span>}
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
