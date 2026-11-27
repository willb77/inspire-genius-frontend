import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  ArrowRight,
  CheckCircle2,
  FileUp,
  GitBranch,
  Loader2,
  Route as RouteIcon,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Target,
  Trash2,
  Wand2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { KCE_MAX_CONTEXT, KCE_MAX_ROLE_TITLE } from "@/services/knowledge-continuity/llmGuards"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { ACCEPTED_ROLE_FILE_TYPES, extractRoleText } from "@/lib/extractRoleText"
import { useGenerateBlueprint } from "@/hooks/knowledge-continuity/useGenerateBlueprint"
import { useJobDnaSeed } from "@/hooks/knowledge-continuity/useJobDnaSeed"
import { usePersistBlueprint } from "@/hooks/knowledge-continuity/usePersistBlueprint"
import { useSavedRoles } from "@/hooks/knowledge-continuity/useSavedRoles"
import { useSavedRoleBlueprint } from "@/hooks/knowledge-continuity/useSavedRoleBlueprint"
import { useJobDnaList } from "@/hooks/job-blueprint"
import type {
  BlueprintArchetype,
  BlueprintGenerateResponse,
  BlueprintNode,
  BlueprintSeedNode,
  SavedRoleBlueprint,
} from "@/types/knowledge-continuity"
import { FitPageHeader } from "@/components/fit/primitives"

/**
 * Job-Fit "Blueprint a role" studio.
 *
 * **This is a deliberate duplicate of `KceBlueprintPage`'s UI** (owner decision,
 * 2026-07-27): copy the presentation, call the same routes. Extracting the live
 * 749-line KCE page into a shared component risked breaking a shipped surface
 * for no user-visible gain.
 *
 * Only the JSX is duplicated. Every piece of logic stays single-sourced in the
 * existing hooks — `useGenerateBlueprint`, `usePersistBlueprint`, `useSavedRoles`,
 * `useSavedRoleBlueprint`, `useJobDnaSeed`, `useJobDnaList` — so a behaviour
 * change touches one hook, and only a layout/copy change touches both files.
 * **If you change the drafting flow, check the KCE copy too.**
 *
 * What differs from KCE, and why: KCE blueprints a role to plan an *expert
 * interview*; Job-Fit blueprints a role to measure a *person against it*. Same
 * engine, different destination — so the framing, the saved-role action, and the
 * next-step guidance all point at fit, gaps, and pathway instead of capture.
 */

// Job-Fit's saved roles are its own set, keyed separately from KCE's capture
// org so neither surface can disturb the other's saved blueprints. Roles authored
// in the Job DNA / Job Blueprint surface are reachable through the Job DNA
// dropdown below, which is already cross-surface.
const BLUEPRINT_ORG_ID = "job-fit"

function archetypeChoices(t: TFunction): { value: "" | BlueprintArchetype; label: string; hint: string }[] {
  return [
    {
      value: "",
      label: t("blueprintStudio.archetypeAutoLabel", "Auto-detect"),
      hint: t("blueprintStudio.archetypeAutoHint", "Classify from the title"),
    },
    {
      value: "operational",
      label: t("blueprintStudio.archetypeOperationalLabel", "Operational"),
      hint: t("blueprintStudio.archetypeOperationalHint", "Hands-on / task-led"),
    },
    {
      value: "managerial",
      label: t("blueprintStudio.archetypeManagerialLabel", "Managerial"),
      hint: t("blueprintStudio.archetypeManagerialHint", "Judgment + people"),
    },
    {
      value: "executive",
      label: t("blueprintStudio.archetypeExecutiveLabel", "Executive"),
      hint: t("blueprintStudio.archetypeExecutiveHint", "Strategy + relationships"),
    },
  ]
}

function progressStages(t: TFunction): string[] {
  return [
    t("blueprintStudio.stageReading", "Reading the role…"),
    t("blueprintStudio.stageClassifying", "Classifying the role shape…"),
    t("blueprintStudio.stageDrafting", "Drafting the knowledge areas…"),
    t("blueprintStudio.stageOrganizing", "Organizing the tree…"),
    t("blueprintStudio.stageFinalizing", "Finalizing the blueprint…"),
  ]
}

type View =
  | { step: "form" }
  | { step: "review"; blueprint: BlueprintGenerateResponse }
  | { step: "saved"; blueprint: SavedRoleBlueprint }
  | { step: "done"; roleTitle: string; created: number }

// ── shared tree rendering ────────────────────────────────────────────────────

/** Order nodes as a depth-first tree (roots in order, then their children). */
function buildDisplayOrder(nodes: BlueprintNode[]): BlueprintNode[] {
  const childrenOf = new Map<string | null, BlueprintNode[]>()
  for (const n of nodes) {
    const key = n.parent_ref
    const list = childrenOf.get(key) ?? []
    list.push(n)
    childrenOf.set(key, list)
  }
  const out: BlueprintNode[] = []
  const walk = (parentRef: string | null) => {
    for (const n of childrenOf.get(parentRef) ?? []) {
      out.push(n)
      walk(n.ref)
    }
  }
  walk(null)
  if (out.length < nodes.length) {
    const shown = new Set(out.map((n) => n.ref))
    for (const n of nodes) if (!shown.has(n.ref)) out.push(n)
  }
  return out
}

function sectionCount(nodes: BlueprintNode[]): number {
  return new Set(nodes.map((n) => n.section).filter(Boolean)).size
}

function NodeRow({
  node,
  onRename,
  onRemove,
}: {
  node: BlueprintNode
  onRename?: (ref: string, name: string) => void
  onRemove?: (ref: string) => void
}) {
  const { t } = useTranslation("jobFitPages")
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-border p-2.5"
      style={{ marginLeft: `${Math.min(node.depth, 6) * 20}px` }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        {onRename ? (
          <Input
            aria-label={t("blueprintStudio.nodeNameLabel", {
              defaultValue: "Node {{ref}} name",
              ref: node.ref,
            })}
            value={node.name}
            onChange={(e) => onRename(node.ref, e.target.value)}
            className="h-8 text-sm font-medium"
          />
        ) : (
          <div className="text-sm font-medium">{node.name}</div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {node.node_type.replace(/_/g, " ")}
          </Badge>
          {node.section && (
            <Badge variant="secondary" className="text-[10px]">
              {node.section}
            </Badge>
          )}
          {node.rationale && (
            <span className="text-xs text-muted-foreground">— {node.rationale}</span>
          )}
        </div>
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("blueprintStudio.removeNodeLabel", {
            defaultValue: "Remove {{name}}",
            name: node.name,
          })}
          onClick={() => onRemove(node.ref)}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

// ── Step 1: pick or describe a role, then draft ──────────────────────────────

function makeFormSchema(t: TFunction) {
  return z.object({
    role_title: z
      .string()
      .min(1, t("blueprintStudio.roleTitleRequired", "Name the role you want to be measured against"))
      .max(
        KCE_MAX_ROLE_TITLE,
        t("kcPages:llmGuards.roleTitleTooLong", { max: KCE_MAX_ROLE_TITLE })
      ),
    context: z
      .string()
      .max(
        KCE_MAX_CONTEXT,
        t("kcPages:llmGuards.contextTooLong", { max: KCE_MAX_CONTEXT.toLocaleString() })
      )
      .optional(),
    archetype: z.enum(["", "operational", "managerial", "executive"]),
  })
}

type FormValues = z.infer<ReturnType<typeof makeFormSchema>>

function FormStep({
  onDrafted,
  onLoadedSaved,
}: {
  onDrafted: (bp: BlueprintGenerateResponse) => void
  onLoadedSaved: (bp: SavedRoleBlueprint) => void
}) {
  const { t } = useTranslation("jobFitPages")
  const formSchema = useMemo(() => makeFormSchema(t), [t])
  const generate = useGenerateBlueprint()
  const jobDnaList = useJobDnaList()
  const jobDnaSeed = useJobDnaSeed()
  const savedRoles = useSavedRoles(BLUEPRINT_ORG_ID)
  const loadSavedRole = useSavedRoleBlueprint(BLUEPRINT_ORG_ID)

  const { register, handleSubmit, control, setValue, getValues, watch, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: { role_title: "", context: "", archetype: "" },
    })

  // A paste past the cap is kept whole (no maxLength clipping) and the message
  // shows as you paste, not only after a submit; Submit is off until it fits.
  const contextOver = (watch("context") ?? "").length > KCE_MAX_CONTEXT

  const [selectedJobDnaId, setSelectedJobDnaId] = useState("")
  const [seedNodes, setSeedNodes] = useState<BlueprintSeedNode[] | undefined>(undefined)
  const [uploadName, setUploadName] = useState("")
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Drafting is one LLM call, so animate to 90% and snap to 100% on success —
  // the bar always moves and always finishes.
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState("")
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current) }, [])

  const startProgress = () => {
    setProgress(8)
    const stages = progressStages(t)
    setStatusMsg(stages[0])
    let p = 8
    tickRef.current = setInterval(() => {
      p = Math.min(90, p + 6)
      setProgress(p)
      const idx = Math.min(stages.length - 1, Math.floor((p / 90) * stages.length))
      setStatusMsg(stages[idx])
    }, 550)
  }
  const stopProgress = (done: boolean) => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    setProgress(done ? 100 : 0)
    if (!done) setStatusMsg("")
  }

  const onPickJobDna = (id: string) => {
    setSelectedJobDnaId(id)
    if (!id) {
      setSeedNodes(undefined)
      return
    }
    jobDnaSeed.mutate(id, {
      onSuccess: (seed) => {
        setValue("role_title", seed.roleTitle, { shouldValidate: true })
        setSeedNodes(
          seed.nodes.map((n) => ({
            ref: n.ref,
            name: n.name,
            node_type: n.node_type,
            section: n.section,
            parent_ref: n.parent_ref,
          }))
        )
        toast.success(
          t("blueprintStudio.seededToast", {
            defaultValue: "Seeded from \"{{title}}\" — {{count}} areas from its Job DNA.",
            title: seed.roleTitle,
            count: seed.nodes.length,
          }),
        )
      },
    })
  }

  const onPickSavedRole = (roleTitle: string) => {
    if (!roleTitle) return
    loadSavedRole.mutate(roleTitle, { onSuccess: onLoadedSaved })
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
      toast.success(
        t("blueprintStudio.loadedToast", {
          defaultValue: "Loaded \"{{name}}\" — {{chars}} characters of context.",
          name: file.name,
          chars: text.length.toLocaleString(),
        }),
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("blueprintStudio.readFileError", "Couldn't read that file."),
      )
    } finally {
      setExtracting(false)
      if (fileRef.current) fileRef.current.value = "" // allow re-uploading the same file
    }
  }

  const onSubmit = (values: FormValues) => {
    startProgress()
    generate.mutate(
      {
        role_title: values.role_title.trim(),
        context: values.context?.trim() || undefined,
        archetype: values.archetype || undefined,
        seed_nodes: seedNodes && seedNodes.length > 0 ? seedNodes : undefined,
      },
      {
        onSuccess: (bp) => {
          stopProgress(true)
          toast.success(
            t("blueprintStudio.draftedToast", {
              defaultValue: "Blueprint drafted — {{areas}} knowledge areas across {{sections}} sections.",
              areas: bp.nodes.length,
              sections: sectionCount(bp.nodes),
            }),
          )
          onDrafted(bp)
        },
        onError: () => stopProgress(false), // the hook surfaces the error toast
      }
    )
  }

  const drafting = generate.isPending
  const roles = savedRoles.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-[#0D9488]" />
          {t("blueprintStudio.formTitle", "Blueprint a role")}
        </CardTitle>
        <CardDescription>
          {t(
            "blueprintStudio.formDescription",
            "Define the role you want to be measured against. Start from a saved role, a role blueprint someone has already authored, an uploaded job posting, or a plain description — then review the draft before anything is saved.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Saved roles */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="saved_role">{t("blueprintStudio.roleLabel", "Role")}</Label>
              <select
                id="saved_role"
                defaultValue=""
                onChange={(e) => onPickSavedRole(e.target.value)}
                disabled={loadSavedRole.isPending}
                className={selectClass}
              >
                <option value="">{t("blueprintStudio.newRoleOption", "Blueprint a new role…")}</option>
                {roles.map((r) => (
                  <option key={r.role_title} value={r.role_title}>
                    {t("blueprintStudio.savedRoleOption", {
                      defaultValue: "{{title}} ({{count}} areas)",
                      title: r.role_title,
                      count: r.node_count,
                    })}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {loadSavedRole.isPending
                  ? t("blueprintStudio.loadingSaved", "Loading the saved blueprint…")
                  : t(
                      "blueprintStudio.pickSavedHint",
                      "Pick a role you've already blueprinted to see your fit against it, or leave it to draft a new one.",
                    )}
              </p>
            </div>
          )}

          {/* Existing Job DNA / Job Blueprints authored elsewhere */}
          <div className="space-y-2">
            <Label htmlFor="job_dna_seed">
              {t("blueprintStudio.useExisting", "Use an existing role blueprint")}{" "}
              <span className="text-muted-foreground">{t("blueprintStudio.optional", "(optional)")}</span>
            </Label>
            <select
              id="job_dna_seed"
              value={selectedJobDnaId}
              onChange={(e) => onPickJobDna(e.target.value)}
              disabled={jobDnaList.isLoading || jobDnaSeed.isPending}
              className={selectClass}
            >
              <option value="">
                {t("blueprintStudio.startFromTitle", "Start from a role title instead")}
              </option>
              {(jobDnaList.data ?? []).map((jd) => (
                <option key={jd.id} value={jd.id}>{jd.roleTitle}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {jobDnaSeed.isPending
                ? t("blueprintStudio.loadingSeed", "Loading the blueprint's knowledge seed…")
                : t(
                    "blueprintStudio.seedHint",
                    "Roles already authored in Job DNA — picking one seeds this blueprint from its completed DNA.",
                  )}
            </p>
          </div>

          {/* Upload a job posting */}
          <div className="space-y-2">
            <Label>
              {t("blueprintStudio.uploadLabel", "Upload a job posting")}{" "}
              <span className="text-muted-foreground">
                {t("blueprintStudio.uploadOptional", "(optional — Word, PDF, or text)")}
              </span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                onChange={onFileChosen}
                className="hidden"
                aria-label={t("blueprintStudio.uploadLabel", "Upload a job posting")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("blueprintStudio.reading", "Reading…")}
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" /> {t("blueprintStudio.uploadLabel", "Upload a job posting")}
                  </>
                )}
              </Button>
              {uploadName && !extracting && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[#0D9488]" /> {uploadName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "blueprintStudio.uploadHint",
                "Drop in the posting or job description — we read the text into the description below and guess the title. Nothing is uploaded to a server.",
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_title">{t("blueprintStudio.roleTitleLabel", "Role title")}</Label>
            <Input
              id="role_title"
              placeholder={t(
                "blueprintStudio.roleTitlePlaceholder",
                "e.g. Director of Operations, or Senior Product Manager",
              )}
              maxLength={KCE_MAX_ROLE_TITLE}
              {...register("role_title")}
            />
            {errors.role_title && (
              <p className="text-sm text-destructive">{errors.role_title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">
              {t("blueprintStudio.describeRole", "Describe the role")}{" "}
              <span className="text-muted-foreground">{t("blueprintStudio.optional", "(optional)")}</span>
            </Label>
            <Textarea
              id="context"
              rows={4}
              placeholder={t(
                "blueprintStudio.contextPlaceholder",
                "Paste the job posting, or describe what the role actually involves. (An uploaded file fills this in.)",
              )}
              {...register("context")}
            />
            {(contextOver || errors.context) && (
              <p className="text-sm text-destructive">
                {t("kcPages:llmGuards.contextTooLong", { max: KCE_MAX_CONTEXT.toLocaleString() })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("blueprintStudio.roleShape", "Role shape")}</Label>
            <Controller
              control={control}
              name="archetype"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {archetypeChoices(t).map((choice) => (
                    <button
                      key={choice.value || "auto"}
                      type="button"
                      onClick={() => field.onChange(choice.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        field.value === choice.value
                          ? "border-[#0D9488] bg-[rgba(13,148,136,0.06)]"
                          : "border-border hover:border-[#0D9488]/50"
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
              {t(
                "blueprintStudio.shapeHint",
                "The shape decides which knowledge sections lead — an executive role is measured on judgment and relationships, not a task list.",
              )}
            </p>
          </div>

          {/* Draft button + progress */}
          {drafting ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <Progress value={progress} aria-label={t("blueprintStudio.draftingLabel", "Drafting the blueprint")} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMsg} <span className="tabular-nums">({Math.round(progress)}%)</span>
              </div>
            </div>
          ) : (
            <Button type="submit" className="w-full" disabled={contextOver}>
              <Sparkles className="mr-2 h-4 w-4" /> {t("blueprintStudio.draftButton", "Draft the blueprint")}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2: review + edit the drafted tree ───────────────────────────────────

function ReviewStep({
  blueprint,
  onStartOver,
  onSaved,
}: {
  blueprint: BlueprintGenerateResponse
  onStartOver: () => void
  onSaved: (roleTitle: string, created: number) => void
}) {
  const { t } = useTranslation("jobFitPages")
  const persist = usePersistBlueprint()
  const [nodes, setNodes] = useState<BlueprintNode[]>(blueprint.nodes)
  const displayNodes = useMemo(() => buildDisplayOrder(nodes), [nodes])
  const keepCount = nodes.filter((n) => n.name.trim()).length

  const renameNode = (ref: string, name: string) =>
    setNodes((prev) => prev.map((n) => (n.ref === ref ? { ...n, name } : n)))

  const removeNode = (ref: string) =>
    setNodes((prev) => {
      const doomed = new Set<string>([ref])
      let grew = true
      while (grew) {
        grew = false
        for (const n of prev) {
          if (n.parent_ref && doomed.has(n.parent_ref) && !doomed.has(n.ref)) {
            doomed.add(n.ref)
            grew = true
          }
        }
      }
      return prev.filter((n) => !doomed.has(n.ref))
    })

  const approve = () => {
    const clean = nodes.filter((n) => n.name.trim().length > 0)
    if (clean.length === 0) {
      toast.error(
        t("blueprintStudio.nothingToSave", "Nothing to save — add or keep at least one node."),
      )
      return
    }
    persist.mutate(
      { org_id: BLUEPRINT_ORG_ID, role_title: blueprint.role_title, nodes: clean },
      {
        onSuccess: (res) => {
          toast.success(
            t("blueprintStudio.savedToast", {
              defaultValue: "Saved \"{{title}}\" — {{count}} knowledge areas.",
              title: blueprint.role_title,
              count: res.created,
            }),
          )
          onSaved(blueprint.role_title, res.created)
        },
      }
    )
  }

  return (
    <div className="space-y-5">
      {/* Completion summary — unmistakable that the draft finished. */}
      <Card className="border-[#0D9488]/40 bg-[rgba(13,148,136,0.06)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[#0D9488]" />
            <div>
              <div className="font-semibold">{t("blueprintStudio.draftedTitle", "Blueprint drafted")}</div>
              <div className="text-sm text-muted-foreground">
                {t("blueprintStudio.draftedSummaryLead", {
                  defaultValue: "{{areas}} knowledge areas across {{sections}} sections ·",
                  areas: keepCount,
                  sections: sectionCount(nodes),
                })}{" "}
                <span className="capitalize">{blueprint.archetype}</span>{" "}
                {t(
                  "blueprintStudio.draftedSummaryTail",
                  "shape · review and edit below, then save to measure yourself against it.",
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#0D9488]" />
            {blueprint.role_title}
          </CardTitle>
          <CardDescription className="mt-1">
            {blueprint.archetype_rationale}.{" "}
            {t(
              "blueprintStudio.reviewHint",
              "Rename or remove anything — nothing is stored until you save.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayNodes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "blueprintStudio.allRemoved",
                "Every node was removed. Start over to draft a fresh blueprint.",
              )}
            </p>
          )}
          {displayNodes.map((node) => (
            <NodeRow key={node.ref} node={node} onRename={renameNode} onRemove={removeNode} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" /> {t("blueprintStudio.startOver", "Start over")}
        </Button>
        <Button
          type="button"
          onClick={approve}
          disabled={persist.isPending || displayNodes.length === 0}
        >
          {persist.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("blueprintStudio.saving", "Saving…")}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("blueprintStudio.saveRole", {
                defaultValue: "Save role & {{count}} knowledge areas",
                count: keepCount,
              })}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── A previously-saved role, loaded read-only ────────────────────────────────

function SavedRoleView({
  blueprint,
  onBack,
}: {
  blueprint: SavedRoleBlueprint
  onBack: () => void
}) {
  const { t } = useTranslation("jobFitPages")
  const navigate = useNavigate()
  const displayNodes = useMemo(() => buildDisplayOrder(blueprint.nodes), [blueprint.nodes])
  return (
    <div className="space-y-5">
      <Card className="border-[#0D9488]/40 bg-[rgba(13,148,136,0.06)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 shrink-0 text-[#0D9488]" />
            <div>
              <div className="font-semibold">{blueprint.role_title}</div>
              <div className="text-sm text-muted-foreground">
                {t("blueprintStudio.savedSummary", {
                  defaultValue:
                    "Saved blueprint · {{count}} knowledge areas. Ready to measure yourself against.",
                  count: blueprint.nodes.length,
                })}
              </div>
            </div>
          </div>
          <Button type="button" onClick={() => navigate(ROUTES.JOB_FIT.MATCHES)}>
            <ScanSearch className="mr-2 h-4 w-4" /> {t("blueprintStudio.seeMyFit", "See my fit")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          {displayNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("blueprintStudio.noSavedAreas", "This role has no saved knowledge areas.")}
            </p>
          ) : (
            displayNodes.map((node) => <NodeRow key={node.ref} node={node} />)
          )}
        </CardContent>
      </Card>

      <Button type="button" variant="ghost" onClick={onBack}>
        <RotateCcw className="mr-2 h-4 w-4" /> {t("blueprintStudio.blueprintAnother", "Blueprint another role")}
      </Button>
    </div>
  )
}

// ── Step 3: saved, with fit-shaped next steps ────────────────────────────────

function DoneStep({
  roleTitle,
  created,
  onBlueprintAnother,
}: {
  roleTitle: string
  created: number
  onBlueprintAnother: () => void
}) {
  const { t } = useTranslation("jobFitPages")
  const navigate = useNavigate()
  return (
    <Card>
      <CardContent className="space-y-6 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-12 w-12 text-[#0D9488]" />
          <h2 className="text-xl font-semibold">
            {t("blueprintStudio.doneTitle", { defaultValue: "Saved “{{title}}”", title: roleTitle })}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("blueprintStudio.doneBody", {
              defaultValue: "{{count}} knowledge areas are saved. Now find out how you measure against them.",
              count: created,
            })}
          </p>
        </div>

        <div className="mx-auto grid max-w-md gap-3 text-left">
          <button
            type="button"
            onClick={() => navigate(ROUTES.JOB_FIT.MATCHES)}
            className="flex items-center gap-3 rounded-lg border border-[#0D9488]/40 bg-[rgba(13,148,136,0.06)] p-4 text-left transition-colors hover:bg-[rgba(13,148,136,0.12)]"
          >
            <ScanSearch className="h-5 w-5 shrink-0 text-[#0D9488]" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {t("blueprintStudio.seeMyFit", "See my fit")}{" "}
                <span className="text-muted-foreground">{t("blueprintStudio.recommended", "(recommended)")}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "blueprintStudio.seeMyFitHint",
                  "How your profile lines up against this role, area by area.",
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.JOB_FIT.GAPS)}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-[#0D9488]/50"
          >
            <Target className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {t("blueprintStudio.showGrowth", "Show me my growth areas")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "blueprintStudio.showGrowthHint",
                  "What's missing, and which growth areas are worth working on first.",
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.JOB_FIT.PATHWAY)}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-[#0D9488]/50"
          >
            <RouteIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{t("blueprintStudio.planPathway", "Plan the pathway")}</div>
              <div className="text-xs text-muted-foreground">
                {t("blueprintStudio.planPathwayHint", "Turn the growth areas into a route to the role.")}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onBlueprintAnother}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-[#0D9488]/50"
          >
            <Wand2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {t("blueprintStudio.blueprintAnother", "Blueprint another role")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("blueprintStudio.blueprintAnotherHint", "Compare yourself against a second target.")}
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BlueprintStudioPage() {
  const { t } = useTranslation("jobFitPages")
  const [view, setView] = useState<View>({ step: "form" })

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <FitPageHeader
        icon={Wand2}
        title={t("blueprintStudio.formTitle", "Blueprint a role")}
        description={t(
          "blueprintStudio.pageDescription",
          "Define the role you're aiming at — from a saved role, an existing role blueprint, an uploaded posting, or a description. Job Fit measures you against it.",
        )}
      />

      {view.step === "form" && (
        <FormStep
          onDrafted={(bp) => setView({ step: "review", blueprint: bp })}
          onLoadedSaved={(bp) => setView({ step: "saved", blueprint: bp })}
        />
      )}

      {view.step === "review" && (
        <ReviewStep
          blueprint={view.blueprint}
          onStartOver={() => setView({ step: "form" })}
          onSaved={(roleTitle, created) => setView({ step: "done", roleTitle, created })}
        />
      )}

      {view.step === "saved" && (
        <SavedRoleView blueprint={view.blueprint} onBack={() => setView({ step: "form" })} />
      )}

      {view.step === "done" && (
        <DoneStep
          roleTitle={view.roleTitle}
          created={view.created}
          onBlueprintAnother={() => setView({ step: "form" })}
        />
      )}
    </div>
  )
}
