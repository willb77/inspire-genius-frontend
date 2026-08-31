/**
 * SurveySelector — the "select the survey to take" control.
 *
 * A labelled dropdown of every saved survey (title + question count). Emits the
 * chosen survey id upward; the page decides what to do with it (load the taker).
 */
import { ClipboardList } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Survey } from "@/types/survey"

export interface SurveySelectorProps {
  surveys: Survey[]
  value: string | null
  onChange: (surveyId: string) => void
  label?: string
  id?: string
}

export default function SurveySelector({
  surveys,
  value,
  onChange,
  label = "Select a survey to take",
  id = "survey-selector",
}: SurveySelectorProps) {
  if (surveys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No surveys yet. Build one in the <strong>Build</strong> tab to make it
        selectable here.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        {label}
      </Label>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full sm:max-w-md">
          <SelectValue placeholder="Choose a survey…" />
        </SelectTrigger>
        <SelectContent>
          {surveys.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.title || "Untitled survey"} · {s.questions.length}{" "}
              {s.questions.length === 1 ? "question" : "questions"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
