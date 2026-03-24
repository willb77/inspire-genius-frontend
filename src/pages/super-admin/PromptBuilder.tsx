import { useMemo, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import PromptWizardForm from "@/components/super-admin/prompt-builder/PromptWizardForm"
import PromptPreviewPanel from "@/components/super-admin/prompt-builder/PromptPreviewPanel"
import PromptVersionHistory from "@/components/super-admin/prompt-builder/PromptVersionHistory"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { useSavePrompt, useUpdatePrompt, usePromptVersions } from "@/hooks/prompt-builder/usePromptBuilder"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import type { SystemPrompt } from "@/types/prompt-builder"

export default function PromptBuilder() {
  const [selectedCoachId, setSelectedCoachId] = useState("")
  const [promptId, setPromptId] = useState<string | undefined>(undefined)

  const [persona, setPersona] = useState("")
  const [tone, setTone] = useState("")
  const [knowledgeDomain, setKnowledgeDomain] = useState("")
  const [responseStyle, setResponseStyle] = useState("")
  const [constraints, setConstraints] = useState("")

  const { data: coachesData } = useCoachesList({ page: 1, limit: 100 })
  const coaches = useMemo(() => {
    const d = coachesData?.data
    if (Array.isArray(d)) return d as { id: string; name: string }[]
    return d?.agents ?? []
  }, [coachesData])

  const { data: versionsData, isLoading: versionsLoading } = usePromptVersions(selectedCoachId)
  const versions = useMemo(() => versionsData?.data?.versions ?? [], [versionsData])

  const saveMutation = useSavePrompt()
  const updateMutation = useUpdatePrompt()

  const handleSelectVersion = (prompt: SystemPrompt) => {
    setPromptId(prompt.id)
    setPersona(prompt.persona)
    setTone(prompt.tone)
    setKnowledgeDomain(prompt.knowledge_domain)
    setResponseStyle(prompt.response_style)
    setConstraints(prompt.constraints)
  }

  const handleCoachChange = (id: string) => {
    setSelectedCoachId(id)
    setPromptId(undefined)
    setPersona("")
    setTone("")
    setKnowledgeDomain("")
    setResponseStyle("")
    setConstraints("")
  }

  const handleSave = async () => {
    if (!selectedCoachId) return
    const payload = {
      coach_id: selectedCoachId,
      persona,
      tone,
      knowledge_domain: knowledgeDomain,
      response_style: responseStyle,
      constraints,
    }
    if (promptId) {
      await updateMutation.mutateAsync({ id: promptId, payload })
    } else {
      const resp = await saveMutation.mutateAsync(payload)
      if (resp?.data?.id) setPromptId(resp.data.id)
    }
  }

  const isSaving = saveMutation.isPending || updateMutation.isPending

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">System Prompt Builder</h1>
          <div className="flex items-center gap-3">
            <Select value={selectedCoachId} onValueChange={handleCoachChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSave}
              disabled={!selectedCoachId || isSaving}
              className="gap-2"
            >
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Wizard form */}
          <div className="space-y-4">
            <PromptWizardForm
              persona={persona}
              tone={tone}
              knowledgeDomain={knowledgeDomain}
              responseStyle={responseStyle}
              constraints={constraints}
              onPersonaChange={setPersona}
              onToneChange={setTone}
              onKnowledgeDomainChange={setKnowledgeDomain}
              onResponseStyleChange={setResponseStyle}
              onConstraintsChange={setConstraints}
            />
            {selectedCoachId && (
              <PromptVersionHistory
                versions={versions}
                isLoading={versionsLoading}
                onSelectVersion={handleSelectVersion}
              />
            )}
          </div>

          {/* Right — Live preview */}
          <PromptPreviewPanel
            persona={persona}
            tone={tone}
            knowledgeDomain={knowledgeDomain}
            responseStyle={responseStyle}
            constraints={constraints}
          />
        </div>
      </div>
    </SuperAdminLayout>
  )
}
