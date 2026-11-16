/**
 * SurveyBuilder — "add the questions for the survey".
 *
 * Edits one draft Survey: title, description, and an ordered list of questions.
 * Each question row lets the author set the prompt, the answer type, the choices
 * (for single/multi), the rating scale (for rating), and whether it's required.
 * Saving hands the assembled Survey up to `onSave` (the page persists it).
 */
import { useState } from "react"
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createDraftQuestion, createDraftSurvey } from "@/lib/surveyDraft"
import type {
  Survey,
  SurveyQuestion,
  SurveyQuestionType,
} from "@/types/survey"
import { SURVEY_QUESTION_TYPE_LABELS } from "@/types/survey"
import { useTranslation } from "react-i18next"

export interface SurveyBuilderProps {
  /** An existing survey to edit, or undefined to start a fresh draft. */
  initial?: Survey
  onSave: (survey: Survey) => void
  onCancel?: () => void
}

const QUESTION_TYPES: SurveyQuestionType[] = [
  "text",
  "single",
  "multi",
  "rating",
]

export default function SurveyBuilder({
  initial,
  onSave,
  onCancel,
}: SurveyBuilderProps) {
  const { t: tr } = useTranslation("studioUi")
  const [draft, setDraft] = useState<Survey>(
    () => initial ?? createDraftSurvey(),
  )

  const patch = (updates: Partial<Survey>) =>
    setDraft((d) => ({ ...d, ...updates }))

  const updateQuestion = (id: string, updates: Partial<SurveyQuestion>) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q,
      ),
    }))

  const addQuestion = () =>
    setDraft((d) => ({
      ...d,
      questions: [...d.questions, createDraftQuestion("text")],
    }))

  const removeQuestion = (id: string) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.filter((q) => q.id !== id),
    }))

  const moveQuestion = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const idx = d.questions.findIndex((q) => q.id === id)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= d.questions.length) return d
      const next = [...d.questions]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, questions: next }
    })

  const changeType = (id: string, type: SurveyQuestionType) => {
    const patchForType: Partial<SurveyQuestion> = { type }
    if (type === "single" || type === "multi") {
      const existing = draft.questions.find((q) => q.id === id)
      patchForType.options =
        existing?.options && existing.options.length > 0
          ? existing.options
          : ["", ""]
    } else {
      patchForType.options = undefined
    }
    patchForType.scaleMax = type === "rating" ? 5 : undefined
    updateQuestion(id, patchForType)
  }

  const setOption = (qId: string, optIdx: number, text: string) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => {
        if (q.id !== qId) return q
        const options = [...(q.options ?? [])]
        options[optIdx] = text
        return { ...q, options }
      }),
    }))

  const addOption = (qId: string) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) =>
        q.id === qId ? { ...q, options: [...(q.options ?? []), ""] } : q,
      ),
    }))

  const removeOption = (qId: string, optIdx: number) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) =>
        q.id === qId
          ? { ...q, options: (q.options ?? []).filter((_, i) => i !== optIdx) }
          : q,
      ),
    }))

  const handleSave = () => {
    if (!draft.title.trim()) {
      toast.error(tr("survey.surveyBuilder.giveTheSurveyATitle", { defaultValue: "Give the survey a title before saving." }))
      return
    }
    if (draft.questions.length === 0) {
      toast.error(tr("survey.surveyBuilder.addAtLeastOneQuestion", { defaultValue: "Add at least one question before saving." }))
      return
    }
    // Trim empty option rows for choice questions.
    const cleaned: Survey = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description?.trim() || undefined,
      orgId: draft.orgId?.trim() || undefined,
      questions: draft.questions.map((q) => ({
        ...q,
        prompt: q.prompt.trim(),
        options:
          q.type === "single" || q.type === "multi"
            ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
            : undefined,
      })),
    }
    const badChoice = cleaned.questions.find(
      (q) =>
        (q.type === "single" || q.type === "multi") &&
        (q.options?.length ?? 0) < 2,
    )
    if (badChoice) {
      toast.error(tr("survey.surveyBuilder.choiceQuestionsNeedAtLeast", { defaultValue: "Choice questions need at least two options." }))
      return
    }
    onSave(cleaned)
    toast.success(tr("survey.surveyBuilder.surveySaved", { defaultValue: "Survey saved." }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("survey.surveyBuilder.surveyDetails", { defaultValue: "Survey details" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="survey-title">{tr("survey.surveyBuilder.title", { defaultValue: "Title" })}</Label>
            <Input
              id="survey-title"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={tr("survey.surveyBuilder.eGTeamPulseCheck", { defaultValue: "e.g. Team Pulse Check" })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="survey-desc">{tr("survey.surveyBuilder.descriptionOptional", { defaultValue: "Description (optional)" })}</Label>
            <Textarea
              id="survey-desc"
              value={draft.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder={tr("survey.surveyBuilder.whatIsThisSurveyFor", { defaultValue: "What is this survey for?" })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="survey-org">{tr("survey.surveyBuilder.exposeToOrganization", { defaultValue: "Expose to organization" })}</Label>
            <Input
              id="survey-org"
              value={draft.orgId ?? ""}
              onChange={(e) => patch({ orgId: e.target.value })}
              placeholder={tr("survey.surveyBuilder.organizationIdLeaveBlankTo", { defaultValue: "Organization ID (leave blank to use your own)" })}
            />
            <p className="text-xs text-muted-foreground">
              {tr("survey.surveyBuilder.membersOfThisOrganizationWill", { defaultValue: "Members of this organization will see the survey in their Settings → My Workspace. Leave blank to expose it to your own organization." })}
            </p>
          </div>
          <label className="flex items-start justify-between gap-4 rounded-md border p-3">
            <span className="space-y-0.5">
              <span className="text-sm font-medium">{tr("survey.surveyBuilder.availableToRespondents", { defaultValue: "Available to respondents" })}</span>
              <span className="block text-xs text-muted-foreground">
                {tr("survey.surveyBuilder.offKeepsItHiddenUntil", { defaultValue: "Off keeps it hidden until you're ready. Turn on to make it available to your organization." })}
              </span>
            </span>
            <Switch
              checked={!!draft.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
              aria-label={tr("survey.surveyBuilder.availableToRespondents", { defaultValue: "Available to respondents" })}
            />
          </label>
        </CardContent>
      </Card>

      {draft.questions.map((q, idx) => (
        <Card key={q.id} data-testid={`builder-q-${q.id}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GripVertical className="h-4 w-4" aria-hidden />
              {tr("survey.surveyBuilder.question", { defaultValue: "Question {{v1}}", v1: idx + 1 })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveQuestion(q.id, -1)}
                disabled={idx === 0}
                aria-label={tr("survey.surveyBuilder.moveQuestionUp", { defaultValue: "Move question up" })}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveQuestion(q.id, 1)}
                disabled={idx === draft.questions.length - 1}
                aria-label={tr("survey.surveyBuilder.moveQuestionDown", { defaultValue: "Move question down" })}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(q.id)}
                aria-label={tr("survey.surveyBuilder.removeQuestion", { defaultValue: "Remove question" })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`prompt-${q.id}`}>{tr("survey.surveyBuilder.questionText", { defaultValue: "Question text" })}</Label>
              <Input
                id={`prompt-${q.id}`}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                placeholder={tr("survey.surveyBuilder.whatDoYouWantTo", { defaultValue: "What do you want to ask?" })}
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor={`type-${q.id}`}>{tr("survey.surveyBuilder.answerType", { defaultValue: "Answer type" })}</Label>
                <Select
                  value={q.type}
                  onValueChange={(v) =>
                    changeType(q.id, v as SurveyQuestionType)
                  }
                >
                  <SelectTrigger id={`type-${q.id}`} className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {SURVEY_QUESTION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {q.type === "rating" && (
                <div className="space-y-2">
                  <Label htmlFor={`scale-${q.id}`}>{tr("survey.surveyBuilder.maxRating", { defaultValue: "Max rating" })}</Label>
                  <Input
                    id={`scale-${q.id}`}
                    type="number"
                    min={2}
                    max={10}
                    value={q.scaleMax ?? 5}
                    onChange={(e) =>
                      updateQuestion(q.id, {
                        scaleMax: Math.max(
                          2,
                          Math.min(10, Number(e.target.value) || 5),
                        ),
                      })
                    }
                    className="w-24"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 pb-2 text-sm">
                <Switch
                  checked={!!q.required}
                  onCheckedChange={(v) => updateQuestion(q.id, { required: v })}
                  aria-label={tr("survey.surveyBuilder.required", { defaultValue: "Required" })}
                />
                {tr("survey.surveyBuilder.required", { defaultValue: "Required" })}
              </label>
            </div>

            {(q.type === "single" || q.type === "multi") && (
              <div className="space-y-2">
                <Label>{tr("survey.surveyBuilder.options", { defaultValue: "Options" })}</Label>
                {(q.options ?? []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => setOption(q.id, optIdx, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      aria-label={`Question ${idx + 1} option ${optIdx + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(q.id, optIdx)}
                      aria-label={tr("survey.surveyBuilder.removeOption", { defaultValue: "Remove option" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(q.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {tr("survey.surveyBuilder.addOption", { defaultValue: "Add option" })}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          {tr("survey.surveyBuilder.addQuestion", { defaultValue: "Add question" })}
        </Button>
        <div className="flex-1" />
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {tr("survey.surveyBuilder.cancel", { defaultValue: "Cancel" })}
          </Button>
        )}
        <Button type="button" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {tr("survey.surveyBuilder.saveSurvey", { defaultValue: "Save survey" })}
        </Button>
      </div>
    </div>
  )
}
