import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Save, Upload, Undo2 } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useActivePrompt, usePromptVersions, useCreatePrompt, usePublishPrompt } from "@/hooks/trainer/useTrainer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { ROUTES } from "@/constants/routes"
import { formatDate } from "@/lib/house/formatDate"

type PromptVersion = { version: number; status: string; token_count?: number; created_at?: string }

/**
 * House-style Prompt Studio (admin switch). Same data and the same three live
 * actions as the classic page — Save draft, Publish, Restore — calling the same
 * hooks with the same arguments. What is gone is what never worked:
 *   - the "Sections" tab, whose six boxes were never saved anywhere;
 *   - the "Live Preview" box, whose "Send Test Message" button had no handler.
 * The preview is replaced by an honest note and a link to the coach's Test page,
 * which does hold a conversation.
 */
export default function PromptStudioHouse() {
  const { agentId } = useParams<{ agentId: string }>()
  const [draftText, setDraftText] = useState("")
  const [activeTab, setActiveTab] = useState("editor")

  const { data: activeResp } = useActivePrompt(agentId || "")
  const { data: versionsResp } = usePromptVersions(agentId || "")
  const createPrompt = useCreatePrompt()
  const publishPrompt = usePublishPrompt()

  const active = (activeResp as { data?: { prompt_text?: string } } | undefined)?.data
  const versions: PromptVersion[] = (versionsResp as { data?: PromptVersion[] } | undefined)?.data ?? []

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
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <PageHeader
          title="Prompt Studio"
          description={`The instructions coach ${agentId ?? ""} works from. Save a draft, then publish it to make it live.`}
          back={{ to: ROUTES.SUPER_ADMIN.AGENT_TRAINER, label: "Agent Trainer" }}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col rounded-md border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <Badge variant="outline">{tokenCount} tokens</Badge>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDraft} disabled={createPrompt.isPending}>
                  <Save className="mr-1 h-4 w-4" aria-hidden="true" /> Save draft
                </Button>
                {versions.length > 0 && (
                  <Button size="sm" variant="default" onClick={() => handlePublish(versions[0]?.version)}>
                    <Upload className="mr-1 h-4 w-4" aria-hidden="true" /> Publish
                  </Button>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
              <TabsList className="mx-3 mt-2 w-fit">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="history">History ({versions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="flex-1 p-3">
                <Textarea
                  className="min-h-[500px] resize-none font-mono text-sm"
                  placeholder="Enter your system prompt here..."
                  aria-label="Prompt text"
                  value={draftText || active?.prompt_text || ""}
                  onChange={(e) => setDraftText(e.target.value)}
                />
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-y-auto p-3">
                {versions.length === 0 ? (
                  <PageState
                    kind="empty"
                    title="No saved versions yet"
                    message="Save a draft and it will appear here."
                  />
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <Card key={v.version}>
                        <CardContent className="flex items-center justify-between p-3">
                          <div>
                            <span className="font-medium">v{v.version}</span>
                            <Badge variant={v.status === "active" ? "default" : "secondary"} className="ml-2 text-xs">
                              {v.status === "active" ? "Live" : v.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{v.token_count} tokens</span>
                            <span>{formatDate(v.created_at)}</span>
                            {v.status !== "active" && (
                              <Button size="sm" variant="ghost" onClick={() => handlePublish(v.version)}>
                                <Undo2 className="mr-1 h-3 w-3" aria-hidden="true" /> Restore
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <PageState
            kind="unavailable"
            message="Trying a message against a draft isn't available on this page yet. Use Test to hold a conversation with this coach."
            action={
              agentId ? (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${ROUTES.SUPER_ADMIN.AGENT_TRAINER}/${agentId}/test`}>Open Test</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      </div>
    </SuperAdminLayout>
  )
}
