import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import type { TFunction } from "i18next"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
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
import { kceErrorMessage } from "@/services/knowledge-continuity/authz"
import { calculateBenchmark, getInterpretation } from "@/lib/job-blueprint/scoring"
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

function archetypeChoices(t: TFunction): { value: DraftArchetype; label: string; hint: string }[] {
  return [
    { value: "", label: t("draftFlow.archetype.auto.label", { defaultValue: "Auto-detect" }), hint: t("draftFlow.archetype.auto.hint", { defaultValue: "Classify from the title" }) },
    { value: "operational", label: t("draftFlow.archetype.operational.label", { defaultValue: "Operational" }), hint: t("draftFlow.archetype.operational.hint", { defaultValue: "Hands-on / task-led" }) },
    { value: "managerial", label: t("draftFlow.archetype.managerial.label", { defaultValue: "Managerial" }), hint: t("draftFlow.archetype.managerial.hint", { defaultValue: "Judgment + people" }) },
    { value: "executive", label: t("draftFlow.archetype.executive.label", { defaultValue: "Executive" }), hint: t("draftFlow.archetype.executive.hint", { defaultValue: "Strategy + relationships" }) },
  ]
}

function progressStages(t: TFunction): string[] {
  return [
    t("draftFlow.progress.reading", { defaultValue: "Reading the role…" }),
    t("draftFlow.progress.assessing", { defaultValue: "Assessing the behavioral demands…" }),
    t("draftFlow.progress.setting", { defaultValue: "Setting the 22 benchmarks…" }),
    t("draftFlow.progress.balancing", { defaultValue: "Balancing the profile…" }),
    t("draftFlow.progress.finalizing", { defaultValue: "Finalizing the blueprint…" }),
  ]
}

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

function draftTierLabel(t: TFunction, interpretation: DraftDimension["interpretation"]): string {
  const labels: Record<DraftDimension["interpretation"], string> = {
    critical: t("draftFlow.tier.critical", { defaultValue: "Critical" }),
    "counter-productive": t("draftFlow.tier.counterProductive", { defaultValue: "Counter-productive" }),
    unimportant: t("draftFlow.tier.unimportant", { defaultValue: "Unimportant" }),
  }
  return labels[interpretation]
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

/**
 * True when the drafter returned Rank-then-Rate: every target is
 * calculateBenchmark(rank, rate) and each rate is an AI proposal with the range
 * that keeps its §3 tier. Older drafters return a stamped ladder instead, and
 * the review falls back to the percent editor they shipped with.
 */
function isRankThenRate(draft: DraftBenchmarkResponse): boolean {
  if (draft.method !== "rank-then-rate") return false
  return [...draft.behaviors, ...draft.aptitudes, ...draft.core_traits].every(
    (d) => typeof d.rate_min === "number" && typeof d.rate_max === "number",
  )
}

/** The live target for a rate, from the authoritative scoring.ts (rank is stored 1-based). */
function targetFor(d: DraftDimension, rate: number): number {
  return calculateBenchmark(d.rank_position - 1, rate, d.category)
}

const dimKey = (d: DraftDimension) => `${d.category}-${d.dimension_id}`

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

const makeFormSchema = (t: TFunction) =>
  z.object({
    role_title: z.string().min(1, t("draftFlow.val.roleTitle", { defaultValue: "Name the role to benchmark" })),
    context: z.string().optional(),
    archetype: z.enum(["", "operational", "managerial", "executive"]),
  })

type FormValues = z.infer<ReturnType<typeof makeFormSchema>>

function FormStep({ onDrafted }: { onDrafted: (draft: DraftBenchmarkResponse) => void }) {
  const { t } = useTranslation("jobBlueprintPages")
  const PROGRESS_STAGES = progressStages(t)
  const ARCHETYPE_CHOICES = archetypeChoices(t)
  const navigate = useNavigate()
  const draft = useDraftBenchmark()
  const { roles, isLoading: rolesLoading, kceError } = useAllRoles()

  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(makeFormSchema(t)),
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
      toast.success(t("draftFlow.loadedFromKce", { defaultValue: "Loaded \"{{title}}\" from Knowledge Continuity.", title: role.role_title }))
    } catch {
      // Best-effort only — the title prefill is enough to draft from.
      toast.success(t("draftFlow.loaded", { defaultValue: "Loaded \"{{title}}\".", title: role.role_title }))
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
      toast.success(t("draftFlow.loadedFile", { defaultValue: "Loaded \"{{name}}\" — {{chars}} characters of context.", name: file.name, chars: text.length.toLocaleString() }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("draftFlow.readFailed", { defaultValue: "Couldn't read that file." }))
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
          toast.success(t("draftFlow.drafted", { defaultValue: "Blueprint drafted — 22 dimensions to review." }))
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
          {t("draftFlow.title", { defaultValue: "Draft a blueprint" })}
        </CardTitle>
        <CardDescription>
          {t("draftFlow.description", { defaultValue: "Draft all 22 dimensions for a role from a title, an uploaded job description, or a role from another vertical. The draft is the engine's reading of the role against the PRISM definition of each dimension — a starting point, not a validated PRISM benchmark. You review and edit the profile before anything is saved." })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Cross-vertical role picker */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="role_picker">{t("draftFlow.role", { defaultValue: "Role" })}</Label>
              <select
                id="role_picker"
                defaultValue=""
                onChange={(e) => onPickRole(e.target.value)}
                disabled={rolesLoading || loadingRole}
                className={selectClass}
              >
                <option value="">{t("draftFlow.draftNew", { defaultValue: "Draft a new role…" })}</option>
                {roles.map((r) => (
                  <option key={roleOptionValue(r)} value={roleOptionValue(r)}>
                    {r.role_title} — {r.source === "job-dna" ? t("draftFlow.sourceJobDna", { defaultValue: "Job DNA" }) : t("draftFlow.sourceKce", { defaultValue: "KCE" })}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {loadingRole
                  ? t("draftFlow.loadingRole", { defaultValue: "Loading the role…" })
                  : t("draftFlow.pickRole", { defaultValue: "Pick an existing role — a Job DNA role opens its blueprint; a Knowledge Continuity role seeds this draft." })}
              </p>
            </div>
          )}
          {kceError != null && (
            <p role="alert" className="text-xs text-muted-foreground">
              {kceErrorMessage(kceError, t("draftFlow.kceLoadFailed", { defaultValue: "Couldn't load the roles saved in Knowledge Continuity." }))}
            </p>
          )}

          {/* Upload a role document */}
          <div className="space-y-2">
            <Label>
              {t("draftFlow.upload.label", { defaultValue: "Upload a role" })}{" "}
              <span className="text-muted-foreground">{t("draftFlow.upload.optional", { defaultValue: "(optional — Word, PDF, or text)" })}</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                onChange={onFileChosen}
                className="hidden"
                aria-label={t("draftFlow.upload.ariaLabel", { defaultValue: "Upload a role document" })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("draftFlow.upload.reading", { defaultValue: "Reading…" })}</>
                ) : (
                  <><FileUp className="mr-2 h-4 w-4" /> {t("draftFlow.upload.label", { defaultValue: "Upload a role" })}</>
                )}
              </Button>
              {uploadName && !extracting && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {uploadName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("draftFlow.upload.note", { defaultValue: "Drop in a job description or role charter — we read the text into the context below and guess the title. Nothing is uploaded to a server." })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_title">{t("draftFlow.roleTitle", { defaultValue: "Role title" })}</Label>
            <Input
              id="role_title"
              placeholder={t("draftFlow.roleTitlePlaceholder", { defaultValue: "e.g. Senior Wastewater Treatment Operator, or CIO" })}
              {...register("role_title")}
            />
            {errors.role_title && (
              <p className="text-sm text-destructive">{errors.role_title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">
              {t("draftFlow.context", { defaultValue: "Context" })}{" "}
              <span className="text-muted-foreground">{t("draftFlow.contextOptional", { defaultValue: "(optional)" })}</span>
            </Label>
            <Textarea
              id="context"
              rows={4}
              placeholder={t("draftFlow.contextPlaceholder", { defaultValue: "Paste a job description, or a few lines on what this role really demands. (An uploaded file fills this in.)" })}
              {...register("context")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("draftFlow.roleShape", { defaultValue: "Role shape" })}</Label>
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
              {t("draftFlow.shapeNote", { defaultValue: "The shape tilts which dimensions the drafter marks critical — an executive leans on judgment and relationships, not a task list." })}
            </p>
          </div>

          {/* Draft button + progress */}
          {drafting ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <Progress value={progress} aria-label={t("draftFlow.drafting", { defaultValue: "Drafting the blueprint" })} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMsg} <span className="tabular-nums">({Math.round(progress)}%)</span>
              </div>
            </div>
          ) : (
            <Button type="submit" className="w-full">
              <Sparkles className="mr-2 h-4 w-4" /> {t("draftFlow.draftButton", { defaultValue: "Draft the blueprint" })}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2: review + edit the drafted benchmark ──────────────────────────────

type Block = { key: "behaviors" | "aptitudes" | "core_traits"; title: string }

function DimensionRow({
  dim,
  onPercentChange,
}: {
  dim: DraftDimension
  onPercentChange: (value: number) => void
}) {
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
      <div className="flex-1">
        <div className="text-sm font-medium">{dim.dimension_name}</div>
        <Badge variant="outline" className={cn("mt-1 text-[10px]", DRAFT_TIER_STYLE[dim.interpretation])}>
          {draftTierLabel(t, dim.interpretation)}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={100}
          value={dim.final_benchmark_percent}
          aria-label={t("draftFlow.row.benchmarkPercent", { defaultValue: "{{name}} benchmark percent", name: dim.dimension_name })}
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

/**
 * One dimension under Rank-then-Rate: its rank is fixed by the draft, its rate
 * is the AI's proposal and is the reviewer's to change — but only within the
 * range that keeps the dimension in its tier, so the block's required counts
 * of critical / counter-productive dimensions always hold. The target shown is
 * computed live from the rank and the chosen rate.
 */
function RateRow({
  dim,
  blockSize,
  proposedRate,
  onRateChange,
}: {
  dim: DraftDimension
  blockSize: number
  proposedRate: number
  onRateChange: (rate: number) => void
}) {
  const { t } = useTranslation("jobBlueprintPages")
  const lo = dim.rate_min ?? 1
  const hi = dim.rate_max ?? lo
  const maxRate = dim.max_rate ?? hi
  const rates = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  const tier = draftTierLabel(t, dim.interpretation).toLowerCase()
  const heldBack = typeof dim.ai_rate === "number" && dim.ai_rate !== proposedRate
  const changed = dim.rate_value !== proposedRate

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{dim.dimension_name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px]", DRAFT_TIER_STYLE[dim.interpretation])}>
              {draftTierLabel(t, dim.interpretation)}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {t("draftFlow.row.rank", { defaultValue: "Rank {{rank}} of {{size}}", rank: dim.rank_position, size: blockSize })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`rate-${dimKey(dim)}`} className="text-xs text-muted-foreground">
            {t("draftFlow.row.rate", { defaultValue: "Rate" })}
          </Label>
          <select
            id={`rate-${dimKey(dim)}`}
            aria-label={t("draftFlow.row.rateAria", { defaultValue: "{{name}} rate", name: dim.dimension_name })}
            value={dim.rate_value}
            onChange={(e) => onRateChange(Number(e.target.value))}
            className={cn(selectClass, "h-8 w-28 py-1")}
          >
            {rates.map((r) => (
              <option key={r} value={r}>
                {r === proposedRate
                  ? t("draftFlow.row.rateOptionAi", { defaultValue: "{{rate}} of {{max}} (AI)", rate: r, max: maxRate })
                  : t("draftFlow.row.rateOption", { defaultValue: "{{rate}} of {{max}}", rate: r, max: maxRate })}
              </option>
            ))}
          </select>
          <div className="w-16 text-right">
            <div
              className="text-sm font-semibold tabular-nums"
              aria-label={t("draftFlow.row.targetAria", { defaultValue: "{{name}} target", name: dim.dimension_name })}
            >
              {dim.final_benchmark_percent}%
            </div>
            <div className="text-[10px] text-muted-foreground">{t("draftFlow.row.target", { defaultValue: "target" })}</div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {t("draftFlow.row.aiProposed", { defaultValue: "AI proposed {{rate}} of {{max}}", rate: proposedRate, max: maxRate })}
        {heldBack
          ? ` (${t("draftFlow.row.heldBack", { defaultValue: "it suggested {{ai}}; held at {{held}} so this stays {{tier}}", ai: dim.ai_rate, held: proposedRate, tier })})`
          : ""}
        {changed ? ` · ${t("draftFlow.row.youSet", { defaultValue: "you set {{value}}", value: dim.rate_value })}` : ""}
        {` · ${t("draftFlow.row.ratesKeep", { defaultValue: "rates {{lo}}–{{hi}} keep it {{tier}}", lo, hi, tier })}`}
      </p>
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
  const { t } = useTranslation("jobBlueprintPages")
  const BLOCKS: Block[] = [
    { key: "behaviors", title: t("draftFlow.blocks.behaviors", { defaultValue: "Behaviors" }) },
    { key: "aptitudes", title: t("draftFlow.blocks.aptitudes", { defaultValue: "Work Aptitudes" }) },
    { key: "core_traits", title: t("draftFlow.blocks.coreTraits", { defaultValue: "Core Traits" }) },
  ]
  const createJobDna = useCreateJobDna()
  const finalizeBenchmark = useFinalizeBenchmark()
  const rankRate = isRankThenRate(draft)
  const [saving, setSaving] = useState(false)
  // Under Rank-then-Rate every rate is an AI proposal until a person confirms
  // it; the save that follows is the publish that records who reviewed it.
  const [confirmed, setConfirmed] = useState(false)
  const [blocks, setBlocks] = useState({
    behaviors: draft.behaviors,
    aptitudes: draft.aptitudes,
    core_traits: draft.core_traits,
  })
  // The AI's proposal per dimension, kept so the row can say what changed.
  const [proposed] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      [...draft.behaviors, ...draft.aptitudes, ...draft.core_traits].map((d) => [dimKey(d), d.rate_value]),
    ),
  )

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

  // The select offers only rate_min..rate_max, so every rate reaching here
  // keeps the dimension in its tier.
  const setRate = (key: Block["key"], dim: DraftDimension, rate: number) => {
    setBlocks((prev) => ({
      ...prev,
      [key]: prev[key].map((d) =>
        dimKey(d) === dimKey(dim)
          ? { ...d, rate_value: rate, final_benchmark_percent: targetFor(d, rate) }
          : d,
      ),
    }))
  }

  const allDims = [...blocks.behaviors, ...blocks.aptitudes, ...blocks.core_traits]
  const changedCount = allDims.filter((d) => d.rate_value !== proposed[dimKey(d)]).length

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
        // V2 provenance: the engine drafted it; say from what
        benchmarkSource: "llm-draft",
        sourceRef: `draft-benchmark: ${draft.archetype || "auto"} shape${
          draft.prism_reference?.applied ? `, PRISM reference ${draft.prism_reference.sections?.length ?? 0} sections` : ""
        }${
          rankRate
            ? `; rank-then-rate, rates AI-proposed and confirmed in review (${changedCount} of ${allDims.length} changed)`
            : ""
        }`,
      })

      if (!created?.id) {
        toast.error(t("authoring.noId", { defaultValue: "Job DNA was created but no id was returned." }))
        return
      }

      await finalizeBenchmark.mutateAsync({
        id: created.id,
        benchmark: { behaviors, aptitudes, coreTraits },
      })

      toast.success(t("draftFlow.saved", { defaultValue: "Job DNA saved." }))
      onSaved(draft.role_title, created.id)
    } catch {
      toast.error(t("authoring.saveFailed", { defaultValue: "Failed to save Job DNA. Please try again." }))
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
            <div className="font-semibold">{t("draftFlow.review.drafted", { defaultValue: "Blueprint drafted" })}</div>
            <div className="text-sm text-muted-foreground">
              {t("draftFlow.review.dimsDrafted", { defaultValue: "22 dimensions drafted ·" })} <span className="capitalize">{draft.archetype}</span>{" "}
              {t("draftFlow.review.shape", { defaultValue: "shape." })}
              {draft.rationale ? ` ${draft.rationale}` : ""}{" "}
              {rankRate
                ? t("draftFlow.review.rankRateNote", { defaultValue: "Each target comes from the dimension's rank and a rate the AI proposed. Check every rate, change any you disagree with, then confirm and save. Nothing is saved until you do." })
                : t("draftFlow.review.percentNote", { defaultValue: "This is a draft for you to review, not a validated benchmark. Adjust the percents below, then save." })}
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
            {blocks[block.key].map((dim) =>
              rankRate ? (
                <RateRow
                  key={dimKey(dim)}
                  dim={dim}
                  blockSize={blocks[block.key].length}
                  proposedRate={proposed[dimKey(dim)]}
                  onRateChange={(r) => setRate(block.key, dim, r)}
                />
              ) : (
                <DimensionRow
                  key={dimKey(dim)}
                  dim={dim}
                  onPercentChange={(v) => setPercent(block.key, dim.dimension_id, dim.category, v)}
                />
              ),
            )}
          </CardContent>
        </Card>
      ))}

      {rankRate && (
        <div className="flex items-start gap-2 rounded-lg border border-border p-3">
          <input
            id="confirm-rates"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <Label htmlFor="confirm-rates" className="text-sm font-normal leading-snug">
            {t("draftFlow.review.confirm", { defaultValue: "I have reviewed all {{total}} rates{{changed}} and confirm them. Saving publishes this benchmark with me recorded as its reviewer.", total: allDims.length,
              changed:
                changedCount > 0
                  ? ` (${t("draftFlow.review.changedFromAi", { defaultValue: "{{changed}} changed from the AI's proposal", changed: changedCount })})`
                  : "", })}
          </Label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onStartOver} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" /> {t("draftFlow.review.startOver", { defaultValue: "Start over" })}
        </Button>
        <Button type="button" onClick={save} disabled={saving || (rankRate && !confirmed)}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("draftFlow.review.saving", { defaultValue: "Saving…" })}</>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> {t("draftFlow.review.save", { defaultValue: "Save role & blueprint" })}
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
  const { t } = useTranslation("jobBlueprintPages")
  const navigate = useNavigate()
  return (
    <Card>
      <CardContent className="space-y-6 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">{t("draftFlow.done.saved", { defaultValue: "Saved “{{role}}”", role: roleTitle })}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("draftFlow.done.body", { defaultValue: "The benchmark is saved and the role is now available across your Job DNA surfaces." })}
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
              <div className="text-sm font-semibold">{t("draftFlow.done.view", { defaultValue: "View the blueprint" })}</div>
              <div className="text-xs text-muted-foreground">
                {t("draftFlow.done.viewNote", { defaultValue: "Open the benchmark profile and its charts." })}
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
              <div className="text-sm font-semibold">{t("draftFlow.done.another", { defaultValue: "Draft another" })}</div>
              <div className="text-xs text-muted-foreground">{t("draftFlow.done.anotherNote", { defaultValue: "Benchmark the next role." })}</div>
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
