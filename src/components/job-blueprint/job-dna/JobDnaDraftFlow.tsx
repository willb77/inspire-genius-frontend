import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  FileUp,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { ACCEPTED_ROLE_FILE_TYPES, extractRoleText } from "@/lib/extractRoleText"
import { getSavedRoleBlueprint } from "@/services/knowledge-continuity/continuity.service"
import { getInterpretation } from "@/lib/job-blueprint/scoring"
import { useAllRoles, KCE_ORG_ID } from "@/hooks/job-blueprint/useAllRoles"
import { useDraftBenchmark } from "@/hooks/job-blueprint/useDraftBenchmark"
import { useCreateJobDna, useFinalizeBenchmark } from "@/hooks/job-blueprint/useJobDna"
import type {
  AggregatedRole,
  DimensionBenchmark,
  DraftArchetype,
  DraftBenchmarkResponse,
  DraftDimension,
  JobTier,
} from "@/types/job-blueprint"

const ARCHETYPE_CHOICES: { value: DraftArchetype; label: string; hint: string }[] = [
  { value: "", label: "Auto-detect", hint: "Classify from the title" },
  { value: "operational", label: "Operational", hint: "Hands-on / task-led" },
  { value: "managerial", label: "Managerial", hint: "Judgment + people" },
  { value: "executive", label: "Executive", hint: "Strategy + relationships" },
]

const PROGRESS_STAGES = [
  "Reading the role…",
  "Assessing the behavioral demands…",
  "Setting the 22 benchmarks…",
  "Balancing the profile…",
  "Finalizing the blueprint…",
]

// The archetype shapes the benchmark; it also maps to the persisted tier so the
// saved Job DNA carries the right seniority band.
const ARCHETYPE_TIER: Record<Exclude<DraftArchetype, "">, JobTier> = {
  operational: "front-line",
  managerial: "professional",
  executive: "executive",
}

const DRAFT_TIER_STYLE: Record<DraftDimension["interpretation"], string> = {
  critical: "bg-green-100 text-green-800 border-green-300",
  "counter-productive": "bg-red-100 text-red-800 border-red-300",
  unimportant: "bg-slate-100 text-slate-600 border-slate-300",
}

const DRAFT_TIER_LABEL: Record<DraftDimension["interpretation"], string> = {
  critical: "Critical",
  "counter-productive": "Counter-productive",
  unimportant: "Unimportant",
}

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
)

/** Encode/decode a role option value so source + identity survive the round-trip. */
function roleOptionValue(r: AggregatedRole): string {
  return `${r.source}:${r.id ?? r.role_title}`
}

/** Map a drafted dimension into the persisted benchmark shape (camelCase + band). */
function toBenchmark(d: DraftDimension): DimensionBenchmark {
  return {
    dimensionId: d.dimension_id,
    dimensionName: d.dimension_name,
    category: d.category,
    rankPosition: d.rank_position,
    rankPercent: d.rank_percent,
    rateValue: d.rate_value,
    finalBenchmarkPercent: d.final_benchmark_percent,
    interpretation: getInterpretation(d.final_benchmark_percent),
  }
}

// The flow is a small state machine: form → review a fresh draft → done.
type View =
  | { step: "form" }
  | { step: "review"; draft: DraftBenchmarkResponse }
  | { step: "done"; roleTitle: string; id: string }

// ── Step 1: the draft form ───────────────────────────────────────────────────

const formSchema = z.object({
  role_title: z.string().min(1, "Name the role to benchmark"),
  context: z.string().optional(),
  archetype: z.enum(["", "operational", "managerial", "executive"]),
})

type FormValues = z.infer<typeof formSchema>

function FormStep({ onDrafted }: { onDrafted: (draft: DraftBenchmarkResponse) => void }) {
  const navigate = useNavigate()
  const draft = useDraftBenchmark()
  const { roles, isLoading: rolesLoading } = useAllRoles()

  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: { role_title: "", context: "", archetype: "" },
    })

  const [uploadName, setUploadName] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [loadingRole, setLoadingRole] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── drafting progress (one LLM call; animate to 90% then snap to 100%). ──
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState("")
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current) }, [])

  const startProgress = () => {
    setProgress(8)
    setStatusMsg(PROGRESS_STAGES[0])
    let p = 8
    tickRef.current = setInterval(() => {
      p = Math.min(90, p + 6)
      setProgress(p)
      const idx = Math.min(PROGRESS_STAGES.length - 1, Math.floor((p / 90) * PROGRESS_STAGES.length))
      setStatusMsg(PROGRESS_STAGES[idx])
    }, 550)
  }
  const stopProgress = (done: boolean) => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    setProgress(done ? 100 : 0)
    if (!done) setStatusMsg("")
  }

  const onPickRole = async (value: string) => {
    if (!value) return
    const role = roles.find((r) => roleOptionValue(r) === value)
    if (!role) return

    // A Job DNA role already has a blueprint — jump straight to its detail.
    if (role.source === "job-dna" && role.id) {
      navigate(ROUTES.JOB_DNA.dnaDetail(role.id))
      return
    }

    // A KCE role seeds the draft: prefill the title, best-effort pull its
    // knowledge areas into the context so the drafter has something to chew on.
    setValue("role_title", role.role_title, { shouldValidate: true })
    setLoadingRole(true)
    try {
      const res = await getSavedRoleBlueprint(KCE_ORG_ID, role.role_title)
      const areas = (res.data?.nodes ?? []).map((n) => n.name).filter(Boolean)
      if (areas.length > 0) {
        setValue(
          "context",
          `Role knowledge areas (from the Knowledge Continuity blueprint):\n- ${areas.join("\n- ")}`,
          { shouldValidate: true },
        )
      }
      toast.success(`Loaded "${role.role_title}" from Knowledge Continuity.`)
    } catch {
      // Best-effort only — the title prefill is enough to draft from.
      toast.success(`Loaded "${role.role_title}".`)
    } finally {
      setLoadingRole(false)
    }
  }

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    try {
      const { text, suggestedTitle } = await extractRoleText(file)
      setValue("context", text, { shouldValidate: true })
      if (!getValues("role_title").trim()) {
        setValue("role_title", suggestedTitle, { shouldValidate: true })
      }
      setUploadName(file.name)
      toast.success(`Loaded "${file.name}" — ${text.length.toLocaleString()} characters of context.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file.")
    } finally {
      setExtracting(false)
      if (fileRef.current) fileRef.current.value = "" // allow re-uploading the same file
    }
  }

  const onSubmit = (values: FormValues) => {
    startProgress()
    draft.mutate(
      {
        role_title: values.role_title.trim(),
        context: values.context?.trim() || undefined,
        archetype: values.archetype || "auto",
      },
      {
        onSuccess: (result) => {
          stopProgress(true)
          toast.success("Blueprint drafted — 22 dimensions benchmarked.")
          onDrafted(result)
        },
        onError: () => stopProgress(false), // the hook surfaces the error toast
      },
    )
  }

  const drafting = draft.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Draft a blueprint
        </CardTitle>
        <CardDescription>
          Benchmark all 22 dimensions for a role from a title, an uploaded job description, or a role
          from another vertical. You review and edit the profile before anything is saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Cross-vertical role picker */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="role_picker">Role</Label>
              <select
                id="role_picker"
                defaultValue=""
                onChange={(e) => onPickRole(e.target.value)}
                disabled={rolesLoading || loadingRole}
                className={selectClass}
              >
                <option value="">Draft a new role…</option>
                {roles.map((r) => (
                  <option key={roleOptionValue(r)} value={roleOptionValue(r)}>
                    {r.role_title} — {r.source === "job-dna" ? "Job DNA" : "KCE"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {loadingRole
                  ? "Loading the role…"
                  : "Pick an existing role — a Job DNA role opens its blueprint; a Knowledge Continuity role seeds this draft."}
              </p>
            </div>
          )}

          {/* Upload a role document */}
          <div className="space-y-2">
            <Label>Upload a role <span className="text-muted-foreground">(optional — Word, PDF, or text)</span></Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                onChange={onFileChosen}
                className="hidden"
                aria-label="Upload a role document"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading…</>
                ) : (
                  <><FileUp className="mr-2 h-4 w-4" /> Upload a role</>
                )}
              </Button>
              {uploadName && !extracting && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {uploadName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Drop in a job description or role charter — we read the text into the context below and
              guess the title. Nothing is uploaded to a server.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_title">Role title</Label>
            <Input
              id="role_title"
              placeholder="e.g. Senior Wastewater Treatment Operator, or CIO"
              {...register("role_title")}
            />
            {errors.role_title && (
              <p className="text-sm text-destructive">{errors.role_title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="context"
              rows={4}
              placeholder="Paste a job description, or a few lines on what this role really demands. (An uploaded file fills this in.)"
              {...register("context")}
            />
          </div>

          <div className="space-y-2">
            <Label>Role shape</Label>
            <Controller
              control={control}
              name="archetype"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ARCHETYPE_CHOICES.map((choice) => (
                    <button
                      key={choice.value || "auto"}
                      type="button"
                      onClick={() => field.onChange(choice.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        field.value === choice.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div className="text-sm font-semibold">{choice.label}</div>
                      <div className="text-xs text-muted-foreground">{choice.hint}</div>
                    </button>
                  ))}
                </div>
              )}
            />
            <p className="text-xs text-muted-foreground">
              The shape tilts which dimensions the drafter marks critical — an executive leans on
              judgment and relationships, not a task list.
            </p>
          </div>

          {/* Draft button + progress */}
          {drafting ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <Progress value={progress} aria-label="Drafting the blueprint" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMsg} <span className="tabular-nums">({Math.round(progress)}%)</span>
              </div>
            </div>
          ) : (
            <Button type="submit" className="w-full">
              <Sparkles className="mr-2 h-4 w-4" /> Draft the blueprint
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2: review + edit the drafted benchmark ──────────────────────────────

type Block = { key: "behaviors" | "aptitudes" | "core_traits"; title: string }
const BLOCKS: Block[] = [
  { key: "behaviors", title: "Behaviors" },
  { key: "aptitudes", title: "Work Aptitudes" },
  { key: "core_traits", title: "Core Traits" },
]

function DimensionRow({
  dim,
  onPercentChange,
}: {
  dim: DraftDimension
  onPercentChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
      <div className="flex-1">
        <div className="text-sm font-medium">{dim.dimension_name}</div>
        <Badge variant="outline" className={cn("mt-1 text-[10px]", DRAFT_TIER_STYLE[dim.interpretation])}>
          {DRAFT_TIER_LABEL[dim.interpretation]}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={100}
          value={dim.final_benchmark_percent}
          aria-label={`${dim.dimension_name} benchmark percent`}
          onChange={(e) => {
            const n = Number(e.target.value)
            onPercentChange(Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n)))
          }}
          className="h-8 w-20 text-sm tabular-nums"
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  )
}

function ReviewStep({
  draft,
  onStartOver,
  onSaved,
}: {
  draft: DraftBenchmarkResponse
  onStartOver: () => void
  onSaved: (roleTitle: string, id: string) => void
}) {
  const createJobDna = useCreateJobDna()
  const finalizeBenchmark = useFinalizeBenchmark()
  const [saving, setSaving] = useState(false)
  const [blocks, setBlocks] = useState({
    behaviors: draft.behaviors,
    aptitudes: draft.aptitudes,
    core_traits: draft.core_traits,
  })

  const setPercent = (
    key: Block["key"],
    dimensionId: number,
    category: DraftDimension["category"],
    value: number,
  ) =>
    setBlocks((prev) => ({
      ...prev,
      [key]: prev[key].map((d) =>
        d.dimension_id === dimensionId && d.category === category
          ? { ...d, final_benchmark_percent: value }
          : d,
      ),
    }))

  const save = async () => {
    setSaving(true)
    try {
      const behaviors = blocks.behaviors.map(toBenchmark)
      const aptitudes = blocks.aptitudes.map(toBenchmark)
      const coreTraits = blocks.core_traits.map(toBenchmark)
      const tier: JobTier =
        draft.archetype && draft.archetype in ARCHETYPE_TIER
          ? ARCHETYPE_TIER[draft.archetype as Exclude<DraftArchetype, "">]
          : "professional"

      const created = await createJobDna.mutateAsync({
        roleTitle: draft.role_title,
        department: "",
        tier,
        behaviors,
        aptitudes,
        coreTraits,
      })

      if (!created?.id) {
        toast.error("Job DNA was created but no id was returned.")
        return
      }

      await finalizeBenchmark.mutateAsync({
        id: created.id,
        benchmark: { behaviors, aptitudes, coreTraits },
      })

      toast.success("Job DNA saved.")
      onSaved(draft.role_title, created.id)
    } catch {
      toast.error("Failed to save Job DNA. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Completion summary */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <div className="font-semibold">Blueprint drafted</div>
            <div className="text-sm text-muted-foreground">
              22 dimensions benchmarked · <span className="capitalize">{draft.archetype}</span> shape.
              {draft.rationale ? ` ${draft.rationale}` : ""} Tweak the percents below, then save.
            </div>
          </div>
        </CardContent>
      </Card>

      {BLOCKS.map((block) => (
        <Card key={block.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{block.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blocks[block.key].map((dim) => (
              <DimensionRow
                key={`${dim.category}-${dim.dimension_id}`}
                dim={dim}
                onPercentChange={(v) => setPercent(block.key, dim.dimension_id, dim.category, v)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onStartOver} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" /> Start over
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Save role &amp; blueprint
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Step 3: done ─────────────────────────────────────────────────────────────

function DoneStep({
  roleTitle,
  id,
  onDraftAnother,
}: {
  roleTitle: string
  id: string
  onDraftAnother: () => void
}) {
  const navigate = useNavigate()
  return (
    <Card>
      <CardContent className="space-y-6 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">Saved “{roleTitle}”</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The benchmark is saved and the role is now available across your Job DNA surfaces.
          </p>
        </div>

        <div className="mx-auto grid max-w-md gap-3 text-left">
          <button
            type="button"
            onClick={() => navigate(ROUTES.JOB_DNA.dnaDetail(id))}
            className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">View the blueprint</div>
              <div className="text-xs text-muted-foreground">
                Open the benchmark profile and its charts.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onDraftAnother}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50"
          >
            <Wand2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Draft another</div>
              <div className="text-xs text-muted-foreground">Benchmark the next role.</div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── The flow ─────────────────────────────────────────────────────────────────

export function JobDnaDraftFlow() {
  const [view, setView] = useState<View>({ step: "form" })

  if (view.step === "review") {
    return (
      <ReviewStep
        draft={view.draft}
        onStartOver={() => setView({ step: "form" })}
        onSaved={(roleTitle, id) => setView({ step: "done", roleTitle, id })}
      />
    )
  }

  if (view.step === "done") {
    return (
      <DoneStep
        roleTitle={view.roleTitle}
        id={view.id}
        onDraftAnother={() => setView({ step: "form" })}
      />
    )
  }

  return <FormStep onDrafted={(draft) => setView({ step: "review", draft })} />
}
