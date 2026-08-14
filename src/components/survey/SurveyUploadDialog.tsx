/**
 * SurveyUploadDialog — "upload a set of questions, answers and freeform text to
 * build the survey".
 *
 * The author drops/uploads a file (txt/md/pdf/doc/docx, extracted in-browser)
 * or pastes text. It's sent to survey-service `POST /v1/surveys/parse`, which
 * returns a structured draft (AI-assisted, fail-open to a heuristic parser).
 * The draft opens in the builder for review before saving.
 *
 * Layout: the dialog body scrolls and the action row is a pinned footer, so the
 * "Build survey" button is always reachable even for a tall / small viewport
 * (the base DialogContent has no max-height and would otherwise run off-screen).
 */
import { useRef, useState } from "react"
import { FileUp, Loader2, Sparkles, UploadCloud, Wand2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
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
  const [dragOver, setDragOver] = useState(false)
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
              ? "Survey drafted — review the question types and save."
              : "Survey drafted from your text — check each question type, then save.",
          )
        },
        onError: () => toast.error("Could not build the survey. Try again."),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            Build a survey from questions
          </DialogTitle>
          <DialogDescription>
            Drop in or paste your questions, answer options, and any instructions.
            We'll draft a survey you can review and edit — you set the final
            question types in the next step.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor="upload-title">Title (optional)</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Baseline Survey"
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

            {/* Drag-and-drop zone wrapping the textarea. */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFile(e.dataTransfer.files?.[0])
              }}
              className={cn(
                "rounded-md border border-dashed transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-transparent",
              )}
            >
              <Textarea
                id="upload-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  "Drop a .docx / .pdf / .txt here, or paste, e.g.\n\nHow satisfied are you with onboarding?\n- Very satisfied\n- Neutral\n- Dissatisfied\n\nRate each statement 1–5:\nI feel prepared for what's next.\n\nWhat could we improve?"
                }
                rows={10}
                className="resize-y border-transparent focus-visible:ring-0"
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UploadCloud className="h-3.5 w-3.5" aria-hidden />
              Drag a file onto the box, or use “Upload file.” Word tables and
              checkbox options come through too.
            </p>
          </div>
        </div>

        {/* Pinned footer — always visible so the action is never off-screen. */}
        <div className="flex justify-end gap-2 border-t bg-background p-4">
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
      </DialogContent>
    </Dialog>
  )
}
