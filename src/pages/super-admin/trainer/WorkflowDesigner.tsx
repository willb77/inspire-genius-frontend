import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useWorkflows, useCreateWorkflow, useWorkflow, useValidateWorkflow } from "@/hooks/trainer/useTrainer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitBranch, Plus, CheckCircle2, AlertTriangle } from "lucide-react"

export default function WorkflowDesigner() {
  const [selectedId, setSelectedId] = useState("")
  const [newName, setNewName] = useState("")

  const { data: workflowsResp } = useWorkflows()
  const { data: workflowResp } = useWorkflow(selectedId)
  const createWorkflow = useCreateWorkflow()
  const validateWorkflow = useValidateWorkflow()

  const workflows = (workflowsResp as any)?.data ?? []
  const workflow = (workflowResp as any)?.data

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Workflow List */}
        <div className="w-72 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2"><GitBranch className="h-4 w-4" /> Workflows</h2>
          </div>
          <div className="p-3 flex gap-2">
            <Input placeholder="New workflow..." value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
            <Button size="sm" onClick={() => {
              if (newName) { createWorkflow.mutate({ name: newName, dag_config: { nodes: [], edges: [] } }); setNewName("") }
            }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {workflows.map((w: any) => (
              <div key={w.id} className={`px-4 py-3 cursor-pointer hover:bg-muted/50 border-b ${selectedId === w.id ? "bg-muted" : ""}`} onClick={() => setSelectedId(w.id)}>
                <span className="text-sm font-medium">{w.name}</span>
                {w.agent_sequence && <p className="text-xs text-muted-foreground mt-1">{w.agent_sequence.join(" → ")}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a workflow or create a new one</p>
                <p className="text-xs mt-1">React Flow canvas will be installed for visual editing</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{workflow?.name}</h3>
                  <p className="text-sm text-muted-foreground">{workflow?.description || "No description"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => validateWorkflow.mutate(selectedId)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Validate
                  </Button>
                </div>
              </div>
              {validateWorkflow.data && (
                <div className="p-4 border-b">
                  <Card>
                    <CardContent className="p-3">
                      {(validateWorkflow.data as any)?.data?.valid ? (
                        <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-4 w-4" /> Workflow is valid</div>
                      ) : (
                        <div className="space-y-1">
                          {((validateWorkflow.data as any)?.data?.errors ?? []).map((e: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-red-600 text-sm"><AlertTriangle className="h-4 w-4" /> {e}</div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex-1 bg-muted/20 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg">Visual Workflow Canvas</p>
                  <p className="text-sm mt-1">React Flow integration -- drag agent nodes, connect with edges</p>
                  {workflow?.dag_config && (
                    <div className="mt-4 text-xs">
                      <p>Nodes: {workflow.dag_config.nodes?.length || 0}</p>
                      <p>Edges: {workflow.dag_config.edges?.length || 0}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  )
}
