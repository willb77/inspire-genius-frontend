/**
 * StudioQuestionBuilder — the Interview Studio setup step.
 *
 * Lets an interviewer assemble a scored interview from their OWN questions
 * (not the fixed STAR bank) two ways:
 *   1. **Generate from a topic** — describe the interview (e.g. a career
 *      counselor's "student discovery interview") and let the model draft a
 *      themed question set, then edit it; or
 *   2. **Add manually** — type each question + optional theme.
 *
 * Both feed the same editable list. On confirm it emits an {@link InterviewFrame}
 * with `mode: "custom"` + `kind` + `questions[]` that the live-interview
 * pipeline runs and the generic scorer bands.
 */
import { useRef, useState } from "react"
import { Building2, Loader2, Plus, Sparkles, Trash2, Upload, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import type { InterviewFrame } from "@/services/interview/practice.service"
import {
  employerPackToQuestions,
  generatedSetToQuestions,
  type EmployerPackDetail,
  type InterviewKind,
  type StudioQuestion,
} from "@/services/interview/studio.service"
import {
  useEmployerPacks,
  useGenerateStudioQuestions,
  useLoadEmployerPack,
} from "@/hooks/interview/useStudioInterview"
import {
  extractRoleText,
  ACCEPTED_ROLE_FILE_TYPES,
  RoleExtractionError,
} from "@/lib/extractRoleText"
import { parseQuestionList } from "@/lib/parseQuestionList"

type RowQuestion = { text: string; theme: string; probes?: string[] }

export type StudioQuestionBuilderProps = {
  onConfirm: (frame: InterviewFrame) => void
  submitting?: boolean
}

const KIND_OPTIONS: { value: InterviewKind; label: string; hint: string }[] = [
  { value: "general", label: "Development / discovery", hint: "Warm, growth-oriented — no hiring verdict" },
  { value: "hiring", label: "Hiring / evaluation", hint: "Evaluative — strong-hire … do-not-hire band" },
]

export default function StudioQuestionBuilder({ onConfirm, submitting }: StudioQuestionBuilderProps) {
  const [title, setTitle] = useState("")
  const [purpose, setPurpose] = useState("")
  const [audience, setAudience] = useState("")
  const [kind, setKind] = useState<InterviewKind>("general")
  const [count, setCount] = useState(8)
  const [rows, setRows] = useState<RowQuestion[]>([])

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Curated employer / sector pack, when the interviewer seeds from one. The
  // NAME (not the slug) goes on the frame as `company` so the backend resolver
  // and the export both carry the provenance.
  const [packSlug, setPackSlug] = useState("")
  const [pack, setPack] = useState<EmployerPackDetail | null>(null)

  const generate = useGenerateStudioQuestions()
  const packs = useEmployerPacks()
  const loadPack = useLoadEmployerPack()

  const nonEmpty = rows.filter((r) => r.text.trim().length > 0)

  const addRow = () => setRows((r) => [...r, { text: "", theme: "" }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<RowQuestion>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const handleLoadPack = async () => {
    if (!packSlug) {
      toast.error("Pick an employer or sector first.")
      return
    }
    try {
      const detail = await loadPack.mutateAsync(packSlug)
      setPack(detail)
      // Append rather than replace — an interviewer often wants the framework
      // questions PLUS two of their own.
      setRows((r) => [
        ...r.filter((row) => row.text.trim().length > 0),
        ...employerPackToQuestions(detail).map((q) => ({
          text: q.text,
          theme: q.theme ?? "",
          probes: q.probes,
        })),
      ])
      toast.success(`Loaded ${detail.questions.length} questions from ${detail.pack.name}.`)
    } catch {
      toast.error("Could not load that pack. Add your questions another way.")
    }
  }

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Add an interview topic first.")
      return
    }
    try {
      const set = await generate.mutateAsync({
        topic: title.trim(),
        purpose: purpose.trim() || undefined,
        audience: audience.trim() || undefined,
        num_questions: count,
      })
      const generated: StudioQuestion[] = generatedSetToQuestions(set)
      setRows((r) => [
        ...r,
        ...generated.map((q) => ({ text: q.text, theme: q.theme ?? "", probes: q.probes })),
      ])
      if (set.generated) {
        toast.success(`Drafted ${generated.length} questions — review and edit below.`)
      } else {
        toast.message("Added a starter question set — the AI draft wasn't available, so these are general discovery questions.")
      }
    } catch {
      toast.error("Could not generate questions. Try again, or add them manually.")
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const { text } = await extractRoleText(file)
      const parsed = parseQuestionList(text)
      if (parsed.length === 0) {
        toast.error("No questions found in that file — it may be empty or unreadable.")
        return
      }
      setRows((r) => [...r, ...parsed.map((q) => ({ text: q, theme: "" }))])
      toast.success(`Loaded ${parsed.length} question${parsed.length === 1 ? "" : "s"} — review and edit below.`)
    } catch (e) {
      const msg =
        e instanceof RoleExtractionError
          ? e.message
          : "Could not read that file. Try a .txt, .md, .pdf, or .docx list."
      toast.error(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleConfirm = () => {
    if (nonEmpty.length === 0) {
      toast.error("Add at least one question before starting.")
      return
    }
    const questions: StudioQuestion[] = nonEmpty.map((r) => ({
      text: r.text.trim(),
      theme: r.theme.trim() || undefined,
      probes: r.probes,
    }))
    const frame: InterviewFrame = {
      // STAR fields are unused in custom mode, but `company` IS read: the
      // backend resolves it to the curated pack so the session and its export
      // carry the framework provenance.
      company: pack?.pack.name ?? "",
      industry: pack?.pack.sector ?? "",
      roleTitle: kind === "hiring" ? title.trim() : "",
      reportingLine: "",
      scope: "",
      mode: "custom",
      kind,
      topic: title.trim() || undefined,
      purpose: purpose.trim() || undefined,
      audience: audience.trim() || undefined,
      questions,
      numQuestions: questions.length,
    }
    onConfirm(frame)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-indigo-600" /> Design the interview
          </CardTitle>
          <p className="text-sm text-slate-600">
            Give the interview a topic and pick its style. You can generate a
            question set from the topic, add your own questions, or both.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="studio-title">Interview topic</Label>
            <Input
              id="studio-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Student career discovery, Values & culture fit, New-hire onboarding"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="studio-purpose">Purpose (optional)</Label>
              <Input
                id="studio-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Career counseling led by a counselor"
              />
            </div>
            <div>
              <Label htmlFor="studio-audience">Who you're interviewing (optional)</Label>
              <Input
                id="studio-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. A first-year college student"
              />
            </div>
          </div>
          <div>
            <Label>Interview style</Label>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition",
                    kind === opt.value
                      ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="font-medium text-slate-900">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="generate">
            <TabsList>
              <TabsTrigger value="generate">Generate from topic</TabsTrigger>
              <TabsTrigger value="manual">Add manually</TabsTrigger>
              <TabsTrigger value="upload">Upload a file</TabsTrigger>
              <TabsTrigger value="employer">Employer framework</TabsTrigger>
            </TabsList>
            <TabsContent value="generate" className="space-y-3 pt-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-28">
                  <Label htmlFor="studio-count">How many</Label>
                  <Input
                    id="studio-count"
                    type="number"
                    min={3}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(Math.max(3, Math.min(20, Number(e.target.value) || 8)))}
                  />
                </div>
                <Button type="button" onClick={() => void handleGenerate()} disabled={generate.isPending}>
                  {generate.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate questions
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Uses the topic, purpose, and audience above. Drafted questions
                are added to the list below — edit or remove any before starting.
              </p>
            </TabsContent>
            <TabsContent value="manual" className="pt-3">
              <Button type="button" variant="outline" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" /> Add a question
              </Button>
            </TabsContent>
            <TabsContent value="employer" className="space-y-3 pt-3">
              <p className="text-sm text-slate-600">
                Seed the interview from a curated pack anchored to an employer&apos;s
                own published hiring framework. Every question maps to one of the
                12 competencies, so the framework changes how a question sounds —
                never what is being assessed.
              </p>

              {packs.isError ? (
                <p className="text-sm text-amber-700" role="status">
                  The employer catalogue could not be loaded. Add your questions
                  another way — nothing here is required.
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[18rem] flex-1">
                    <Label htmlFor="studio-employer">Employer or sector</Label>
                    <select
                      id="studio-employer"
                      aria-label="Employer or sector"
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                      value={packSlug}
                      onChange={(e) => setPackSlug(e.target.value)}
                      disabled={packs.isLoading}
                    >
                      <option value="">
                        {packs.isLoading ? "Loading…" : "Select…"}
                      </option>
                      {packs.data?.employers?.length ? (
                        <optgroup label="Employers">
                          {packs.data.employers.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {packs.data?.sectors?.length ? (
                        <optgroup label="Sectors">
                          {packs.data.sectors.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleLoadPack}
                    disabled={!packSlug || loadPack.isPending}
                  >
                    {loadPack.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Building2 className="mr-2 h-4 w-4" />
                    )}
                    Load questions
                  </Button>
                </div>
              )}

              {pack ? (
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{pack.pack.name}</Badge>
                    <span className="text-xs text-slate-500">
                      {pack.questions.length} questions loaded
                    </span>
                  </div>
                  {pack.pack.framework ? (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">Hires against:</span>{" "}
                      {pack.pack.framework}
                    </p>
                  ) : null}
                  {pack.pack.howTheyInterview ? (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">How the loop runs:</span>{" "}
                      {pack.pack.howTheyInterview}
                    </p>
                  ) : null}
                  {pack.pack.optimizesFor ? (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">Optimises for:</span>{" "}
                      {pack.pack.optimizesFor}
                    </p>
                  ) : null}
                  {pack.pack.coachingNote ? (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">Coaching note:</span>{" "}
                      {pack.pack.coachingNote}
                    </p>
                  ) : null}
                  <p className="border-t border-slate-200 pt-2 text-[11px] leading-snug text-slate-500">
                    {pack.provenance}
                  </p>
                </div>
              ) : null}
            </TabsContent>
            <TabsContent value="upload" className="space-y-3 pt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                className="hidden"
                aria-label="Upload a question list file"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? undefined)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Choose a file
              </Button>
              <p className="text-xs text-slate-500">
                Upload a list of questions — one per line — as a .txt, .md, .pdf, or
                .docx file. Numbering and bullets are stripped automatically; each
                question is added to the list below to edit or remove.
              </p>
            </TabsContent>
          </Tabs>

          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
              No questions yet. Generate a set from the topic, or add your own.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary">Q{i + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={row.text}
                    onChange={(e) => updateRow(i, { text: e.target.value })}
                    placeholder="Question text…"
                    rows={2}
                  />
                  <div className="mt-2">
                    <Input
                      value={row.theme}
                      onChange={(e) => updateRow(i, { theme: e.target.value })}
                      placeholder="Theme (optional, e.g. Motivation, Goals) — groups the scored write-up"
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" /> Add another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {nonEmpty.length} question{nonEmpty.length === 1 ? "" : "s"} ready
        </p>
        <Button onClick={handleConfirm} disabled={!!submitting || nonEmpty.length === 0}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Start the interview
        </Button>
      </div>
    </div>
  )
}
