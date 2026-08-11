/**
 * InterviewFrameForm — set the frame for a practice interview.
 *
 * Meridian asks the candidate to confirm the seat they're practising for before
 * the questions start. Five required fields + a few optional ones; on confirm
 * the frame is passed into coaching so Alex tailors questions + feedback to the
 * specific role, reporting line, and scope.
 */
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Upload } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { type InterviewFrame } from "@/services/interview/practice.service"
import {
  ACCEPTED_ROLE_FILE_TYPES,
  extractRoleText,
  RoleExtractionError,
} from "@/lib/extractRoleText"

const schema = z.object({
  company: z.string().min(1, "Company is required").max(255),
  industry: z.string().min(1, "Industry / sector is required").max(160),
  roleTitle: z.string().min(1, "Role title is required").max(160),
  reportingLine: z.string().min(1, "Reporting line is required").max(200),
  scope: z.string().min(1, "Scope of responsibility is required").max(600),
  candidateType: z.enum(["", "external", "internal"]).optional(),
  weightedFocus: z.string().max(600).optional(),
  jobDescription: z.string().max(8000).optional(),
  numQuestions: z.number().int().min(1, "At least 1").max(12, "Max 12 (the STAR bank size)"),
  lengthMinutes: z.number().int().min(1, "At least 1 minute").max(180),
})

type FormValues = z.infer<typeof schema>

export default function InterviewFrameForm({
  initial,
  onConfirm,
  title = "Set up your practice interview",
  description = "Before we begin, please confirm a few things so the questions and coaching fit the actual seat you're preparing for.",
  submitLabel = "Confirm & start the interview",
}: {
  initial?: InterviewFrame | null
  onConfirm: (frame: InterviewFrame) => void
  /** Card heading — differs between the practice and the live-interview surfaces. */
  title?: string
  /** Sub-heading under the title. */
  description?: string
  /** Submit button label. */
  submitLabel?: string
}) {
  const [jdOpen, setJdOpen] = useState(false)
  const [jdBusy, setJdBusy] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)
  const [jdFileName, setJdFileName] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: initial?.company ?? "",
      industry: initial?.industry ?? "",
      roleTitle: initial?.roleTitle ?? "",
      reportingLine: initial?.reportingLine ?? "",
      scope: initial?.scope ?? "",
      candidateType: initial?.candidateType ?? "",
      weightedFocus: initial?.weightedFocus ?? "",
      jobDescription: initial?.jobDescription ?? "",
      numQuestions: initial?.numQuestions ?? 12,
      lengthMinutes: initial?.lengthMinutes ?? 50,
    },
  })

  const err = (k: keyof FormValues) =>
    form.formState.errors[k] ? (
      <p className="mt-1 text-xs text-red-600">{form.formState.errors[k]?.message as string}</p>
    ) : null

  async function handleJdFile(file: File | undefined) {
    if (!file) return
    setJdBusy(true)
    setJdError(null)
    try {
      const { text, suggestedTitle } = await extractRoleText(file)
      form.setValue("jobDescription", text, { shouldValidate: true, shouldDirty: true })
      // Offer the filename-derived title only when the user hasn't typed one.
      if (suggestedTitle && !form.getValues("roleTitle")?.trim()) {
        form.setValue("roleTitle", suggestedTitle, { shouldDirty: true })
      }
      setJdFileName(file.name)
      setJdOpen(false)
    } catch (e) {
      setJdError(
        e instanceof RoleExtractionError
          ? e.message
          : "Couldn't read that file. Try a .txt, .pdf, or Word (.docx) document.",
      )
    } finally {
      setJdBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-slate-600">{description}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => onConfirm(v as InterviewFrame))} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Please confirm five things</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="company">Company (the hiring organization)</Label>
              <Input id="company" {...form.register("company")} />
              {err("company")}
            </div>
            <div>
              <Label htmlFor="industry">Industry / sector</Label>
              <Input id="industry" {...form.register("industry")} />
              {err("industry")}
            </div>
            <div>
              <Label htmlFor="roleTitle">Role title being interviewed for</Label>
              <Input id="roleTitle" {...form.register("roleTitle")} />
              {err("roleTitle")}
              <p className="mt-1 text-xs text-slate-500">Used as the job title to tailor your questions.</p>
            </div>
            <div>
              <Label htmlFor="reportingLine">Reporting line (who this role reports to)</Label>
              <Input id="reportingLine" {...form.register("reportingLine")} />
              {err("reportingLine")}
            </div>
          </div>
          <div>
            <Label htmlFor="scope">Scope of responsibility (team size, budget, P&amp;L, geography — whatever defines the seat)</Label>
            <Textarea id="scope" rows={2} {...form.register("scope")} />
            {err("scope")}
          </div>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Optional but useful</p>
          <div>
            <Label>Is this an external candidate or internal promotion?</Label>
            <div className="mt-1 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" value="external" {...form.register("candidateType")} /> External candidate
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="internal" {...form.register("candidateType")} /> Internal promotion
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="weightedFocus">
              Any competencies or risks to weight more heavily? (e.g. turnaround experience, M&amp;A integration, regulatory exposure)
            </Label>
            <Textarea id="weightedFocus" rows={2} {...form.register("weightedFocus")} />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="jobDescription">
                Job description (optional) — questions will be tailored to it
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setJdError(null)
                  setJdOpen(true)
                }}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </Button>
            </div>
            <Textarea
              id="jobDescription"
              rows={4}
              placeholder="Paste the job description here, or use Upload to import a .pdf, Word (.docx), or text file."
              {...form.register("jobDescription")}
            />
            <p className="mt-1 text-xs text-slate-500">
              {jdFileName
                ? `Imported from ${jdFileName}. You can edit the text above.`
                : "Leave blank to use the role title alone, or the general STAR bank."}
            </p>
          </div>

          <Dialog open={jdOpen} onOpenChange={setJdOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload a job description</DialogTitle>
                <DialogDescription>
                  Import a .pdf, Word (.docx), or text file. We read the text in your
                  browser and drop it into the job-description field — nothing is uploaded
                  to a server. Questions are then tailored to it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept={ACCEPTED_ROLE_FILE_TYPES}
                  disabled={jdBusy}
                  onChange={(e) => void handleJdFile(e.target.files?.[0])}
                />
                {jdBusy && <p className="text-xs text-slate-500">Reading the file…</p>}
                {jdError && <p className="text-xs text-red-600">{jdError}</p>}
                <p className="text-xs text-slate-500">
                  Accepted: .txt, .md, .pdf, .doc, .docx (up to ~8,000 characters).
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="numQuestions">Number of questions</Label>
              <Input id="numQuestions" type="number" min={1} max={12} {...form.register("numQuestions", { valueAsNumber: true })} />
              {err("numQuestions")}
              <p className="mt-1 text-xs text-slate-500">1–12. Default 12 (4 vision, 4 behavioral, 4 productivity).</p>
            </div>
            <div>
              <Label htmlFor="lengthMinutes">Interview length (minutes)</Label>
              <Input id="lengthMinutes" type="number" min={1} max={180} {...form.register("lengthMinutes", { valueAsNumber: true })} />
              {err("lengthMinutes")}
              <p className="mt-1 text-xs text-slate-500">Default 50. The interview ends after your questions — it won't loop.</p>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
