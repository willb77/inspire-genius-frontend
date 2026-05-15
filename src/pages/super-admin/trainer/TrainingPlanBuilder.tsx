import { useState } from "react"
import { useParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useTrainingPlans, useCreateTrainingPlan, useTrainingPlan, useTrainingProgress, useAddTrainingGoal, useEvaluateGoal, useActivateTrainingPlan } from "@/hooks/trainer/useTrainer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Plus, Play, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react"

const STATUS_ICONS = { not_started: Clock, in_progress: TrendingUp, achieved: CheckCircle2, failed: XCircle }
const GOAL_TYPES = ["accuracy", "knowledge_coverage", "satisfaction", "response_quality", "cost_reduction", "guardrail_compliance"]

export default function TrainingPlanBuilder() {
  const { agentId } = useParams<{ agentId: string }>()
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [newPlanName, setNewPlanName] = useState("")
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [newGoalType, setNewGoalType] = useState("accuracy")
  const [newGoalTarget, setNewGoalTarget] = useState("85")

  const { data: plansResp } = useTrainingPlans(agentId || "")
  const { data: planResp } = useTrainingPlan(agentId || "", selectedPlanId)
  const { data: progressResp } = useTrainingProgress(agentId || "", selectedPlanId)
  const createPlan = useCreateTrainingPlan()
  const addGoal = useAddTrainingGoal()
  const evaluateGoal = useEvaluateGoal()
  const activatePlan = useActivateTrainingPlan()

  const plans = (plansResp as any)?.data ?? []
  const plan = (planResp as any)?.data
  const progress = (progressResp as any)?.data

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Plan List */}
        <div className="w-72 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Training Plans</h2>
          </div>
          <div className="p-3 flex gap-2">
            <Input placeholder="New plan..." value={newPlanName} onChange={e => setNewPlanName(e.target.value)} className="text-sm" />
            <Button size="sm" onClick={() => { if (agentId && newPlanName) { createPlan.mutate({ agentId, payload: { name: newPlanName } }); setNewPlanName("") } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {plans.map((p: any) => (
              <div key={p.id} className={`px-4 py-3 cursor-pointer hover:bg-muted/50 border-b ${selectedPlanId === p.id ? "bg-muted" : ""}`} onClick={() => setSelectedPlanId(p.id)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Plan Detail + Goals */}
        <div className="flex-1 flex flex-col">
          {!selectedPlanId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Select a plan or create a new one</div>
          ) : (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{plan?.plan?.name}</h3>
                  <p className="text-sm text-muted-foreground">Target accuracy: {((plan?.plan?.target_accuracy || 0) * 100).toFixed(0)}%</p>
                </div>
                <div className="flex gap-2">
                  {plan?.plan?.status === "draft" && (
                    <Button size="sm" onClick={() => agentId && activatePlan.mutate({ agentId, planId: selectedPlanId })}>
                      <Play className="h-4 w-4 mr-1" /> Activate
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress */}
              {progress && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-bold">{(progress.overall_progress * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={progress.overall_progress * 100} className="h-3" />
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Days elapsed: {progress.days_elapsed}</span>
                    {progress.days_remaining != null && <span>Days remaining: {progress.days_remaining}</span>}
                    <span>Cost: ${progress.cost_to_date?.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Goals */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Goals ({plan?.goals?.length || 0})</h4>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Goal</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Training Goal</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Input placeholder="Goal title" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} />
                        <Select value={newGoalType} onValueChange={setNewGoalType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{GOAL_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Target %" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} />
                        <Button onClick={() => {
                          if (agentId && selectedPlanId && newGoalTitle) {
                            addGoal.mutate({ agentId, planId: selectedPlanId, payload: { title: newGoalTitle, goal_type: newGoalType, target_value: parseFloat(newGoalTarget) / 100 } })
                            setNewGoalTitle("")
                          }
                        }}>Add Goal</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {(plan?.goals ?? []).map((g: any) => {
                  const Icon = STATUS_ICONS[g.status as keyof typeof STATUS_ICONS] || Clock
                  const pct = Math.min(100, (g.current_value / Math.max(g.target_value, 0.01)) * 100)
                  return (
                    <Card key={g.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium text-sm">{g.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{g.goal_type.replace(/_/g, " ")}</Badge>
                            <Button size="sm" variant="ghost" onClick={() => agentId && evaluateGoal.mutate({ agentId, planId: selectedPlanId, goalId: g.id })}>Evaluate</Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Current: {(g.current_value * 100).toFixed(0)}%</span>
                            <span>Target: {(g.target_value * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  )
}
