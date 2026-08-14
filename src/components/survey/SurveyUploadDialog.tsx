/**
 * SurveyUploadDialog — "upload a set of questions, answers and freeform text to
 * build the survey".
 *
 * The author pastes text or uploads a file (txt/md/pdf/doc/docx, extracted
 * in-browser). The text is sent to survey-service `POST /v1/surveys/parse`,
 * which returns a structured draft (AI-assisted, fail-open to a heuristic
 * parser). The draft is handed to `onDraft`, which opens it in the builder for
 * review before saving.
 */
import { useRef, useState } from "react"
import { FileUp, Loader2, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ACCEPTED_ROLE_FILE_TYPES,
  extractRoleText,
  RoleExtractionError,
} from "@/lib/extractRoleText"
import { useParseSurvey } from "@/hooks/survey/useSurveys"
import type { Survey } from "@/types/survey"

export interface SurveyUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Receives the parsed draft to open in the builder. */
  onDraft: (draft: Survey) => void
}

export default function SurveyUploadDialog({
  open,
  onOpenChange,
  onDraft,
}: SurveyUploadDialogProps) {
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parse = useParseSurvey()

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setExtracting(true)
    try {
      const { text: extracted, suggestedTitle } = await extractRoleText(file)
      setText((prev) => (prev ? `${prev}\n${extracted}` : extracted))
      if (!title && suggestedTitle) setTitle(suggestedTitle)
      toast.success("File imported — review the text, then build the survey.")
    } catch (err) {
      const msg =
        err instanceof RoleExtractionError
          ? err.message
          : "Could not read that file."
      toast.error(msg)
    } finally {
      setExtracting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleBuild = () => {
    if (!text.trim()) {
      toast.error("Paste or upload some question text first.")
      return
    }
    parse.mutate(
      { text, title: title.trim() || undefined },
      {
        onSuccess: (result) => {
          if (!result) {
            toast.error("Could not parse that text.")
            return
          }
          const draft: Survey = {
            id: `survey_${Date.now().toString(36)}`,
            title: result.title,
            description: result.description ?? "",
            questions: result.questions,
          }
          onDraft(draft)
          onOpenChange(false)
          setText("")
          setTitle("")
          toast.success(
            result.source === "llm"
              ? "Survey drafted — review and save."
              : "Survey drafted from your text — review and save.",
          )
        },
        onError: () => toast.error("Could not build the survey. Try again."),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            Build a survey from questions
          </DialogTitle>
          <DialogDescription>
            Paste your questions, answer options, and any instructions — or upload
            a file. We'll turn it into a survey draft you can review and edit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-title">Title (optional)</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Onboarding feedback"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="upload-text">Questions &amp; instructions</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={extracting}
                onClick={() => fileInputRef.current?.click()}
              >
                {extracting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <FileUp className="mr-1 h-3 w-3" />
                )}
                Upload file
              </Button>
            </div>
            <Textarea
              id="upload-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "e.g.\nHow satisfied are you with onboarding?\n- Very satisfied\n- Neutral\n- Dissatisfied\n\nWhat could we improve?\n\nRate your overall experience on a scale of 1-5"
              }
              rows={9}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleBuild} disabled={parse.isPending || extracting}>
              {parse.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Build survey
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
