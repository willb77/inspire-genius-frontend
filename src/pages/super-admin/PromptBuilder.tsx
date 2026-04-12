import { useEffect, useMemo, useState } from "react"
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
import { Save, RotateCcw, FilePen } from "lucide-react"
import type { SystemPrompt } from "@/types/prompt-builder"

export default function PromptBuilder() {
  const [selectedCoachId, setSelectedCoachId] = useState("")
  const [promptId, setPromptId] = useState<string | undefined>(undefined)

  const [isHistorical, setIsHistorical] = useState(false)

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

  const { data: versionsData, isLoading: versionsLoading, isError: versionsError } = usePromptVersions(selectedCoachId)
  const versions = useMemo(() => versionsData?.data?.versions ?? [], [versionsData])

  const saveMutation = useSavePrompt()
  const updateMutation = useUpdatePrompt()

  // Auto-load the latest version when versions data arrives.
  // If no versions exist, try to populate from the coach's existing prompt text.
  useEffect(() => {
    if (!selectedCoachId) return
    if (versions.length > 0 && !promptId) {
      const latest = versions[0]
      handleSelectVersion(latest)
    } else if (versions.length === 0 && !versionsLoading && !promptId) {
      // No prompt versions — populate from coach's existing prompt if available
      const coach = coaches.find((c) => c.id === selectedCoachId)
      const existingPrompt = (coach as Record<string, unknown>)?.prompts as Array<{ text: string }> | undefined
      if (existingPrompt?.[0]?.text) {
        setPersona(existingPrompt[0].text)
      }
    }
  }, [versions, versionsLoading, selectedCoachId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectVersion = (prompt: SystemPrompt) => {
    setPromptId(prompt.id)
    setPersona(prompt.persona)
    setTone(prompt.tone)
    setKnowledgeDomain(prompt.knowledge_domain)
    setResponseStyle(prompt.response_style)
    setConstraints(prompt.constraints)
    setIsHistorical(versions.length > 0 && prompt.id !== versions[0]?.id)
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
            {isHistorical && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!selectedCoachId || isSaving}
                className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                <RotateCcw className="size-4" />
                Rollback to This Version
              </Button>
            )}
            {selectedCoachId && promptId && (
              <Button
                variant="outline"
                onClick={() => {
                  setPromptId(undefined)
                  setPersona("")
                  setTone("")
                  setKnowledgeDomain("")
                  setResponseStyle("")
                  setConstraints("")
                  setIsHistorical(false)
                }}
                className="gap-2"
              >
                <FilePen className="size-4" />
                New Prompt
              </Button>
            )}
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
              <>
                {versionsError && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                    <span className="text-amber-600 text-xs mt-0.5">⚠</span>
                    <p className="text-xs text-amber-800">
                      Could not load prompt versions from the server. You can still create a new prompt below.
                    </p>
                  </div>
                )}
                {!versionsLoading && !versionsError && versions.length === 0 && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                    <span className="text-blue-600 text-xs mt-0.5">ℹ</span>
                    <p className="text-xs text-blue-800">
                      No prompt versions found for this mentor. Fill in the fields above and click "Save Prompt" to create the first version.
                    </p>
                  </div>
                )}
                <PromptVersionHistory
                  versions={versions}
                  isLoading={versionsLoading}
                  onSelectVersion={handleSelectVersion}
                />
              </>
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
