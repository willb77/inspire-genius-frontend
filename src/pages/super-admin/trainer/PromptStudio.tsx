import { useState } from "react"
import { useParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useActivePrompt, usePromptVersions, useCreatePrompt, usePublishPrompt } from "@/hooks/trainer/useTrainer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Upload, Undo2, FlaskConical } from "lucide-react"

export default function PromptStudio() {
  const { agentId } = useParams<{ agentId: string }>()
  const [draftText, setDraftText] = useState("")
  const [activeTab, setActiveTab] = useState("editor")

  const { data: activeResp } = useActivePrompt(agentId || "")
  const { data: versionsResp } = usePromptVersions(agentId || "")
  const createPrompt = useCreatePrompt()
  const publishPrompt = usePublishPrompt()

  const active = (activeResp as any)?.data
  const versions = (versionsResp as any)?.data ?? []

  const tokenCount = Math.ceil((draftText || active?.prompt_text || "").length / 4)

  const handleSaveDraft = () => {
    if (!agentId) return
    createPrompt.mutate({ agentId, payload: { prompt_text: draftText } })
  }

  const handlePublish = (version: number) => {
    if (!agentId) return
    publishPrompt.mutate({ agentId, version })
  }

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col border-r">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Prompt Studio — {agentId}</h2>
            <div className="flex gap-2">
              <Badge variant="outline">{tokenCount} tokens</Badge>
              <Button size="sm" onClick={handleSaveDraft} disabled={createPrompt.isPending}>
                <Save className="h-4 w-4 mr-1" /> Save Draft
              </Button>
              {versions.length > 0 && (
                <Button size="sm" variant="default" onClick={() => handlePublish(versions[0]?.version)}>
                  <Upload className="h-4 w-4 mr-1" /> Publish
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="history">History ({versions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="flex-1 p-4">
              <Textarea
                className="h-full min-h-[500px] font-mono text-sm resize-none"
                placeholder="Enter your system prompt here..."
                value={draftText || active?.prompt_text || ""}
                onChange={e => setDraftText(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="sections" className="flex-1 p-4 space-y-4">
              {["Role Definition", "Methodology", "Communication Style", "Few-Shot Examples", "Guardrails", "Contextual Instructions"].map(section => (
                <div key={section}>
                  <label className="text-sm font-medium">{section}</label>
                  <Textarea className="mt-1 font-mono text-sm" rows={4} placeholder={`Enter ${section.toLowerCase()}...`} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="history" className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {versions.map((v: any) => (
                  <Card key={v.version} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium">v{v.version}</span>
                        <Badge variant={v.status === "active" ? "default" : "secondary"} className="ml-2 text-xs">{v.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{v.token_count} tokens</span>
                        <span>{new Date(v.created_at).toLocaleDateString()}</span>
                        {v.status !== "active" && (
                          <Button size="sm" variant="ghost" onClick={() => handlePublish(v.version)}>
                            <Undo2 className="h-3 w-3 mr-1" /> Restore
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Preview */}
        <div className="w-[400px] flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Live Preview</h3>
          </div>
          <div className="flex-1 p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground text-center mt-20">Send a test message to preview agent behavior with the current prompt draft.</p>
            <div className="mt-4">
              <Textarea placeholder="Type a test message..." rows={3} className="text-sm" />
              <Button size="sm" className="mt-2 w-full">Send Test Message</Button>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
