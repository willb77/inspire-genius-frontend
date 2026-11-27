import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Trans, useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileUp,
  GitBranch,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Sparkles,
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
import { isKceAccessDenied } from "@/services/knowledge-continuity/authz"
import { KceAccessInline } from "./KceAccessNotice"
import { useSavedRoleBlueprint } from "@/hooks/knowledge-continuity/useSavedRoleBlueprint"
import { useJobDnaList } from "@/hooks/job-blueprint"
import type {
  BlueprintArchetype,
  BlueprintGenerateResponse,
  BlueprintNode,
  BlueprintSeedNode,
  SavedRoleBlueprint,
} from "@/types/knowledge-continuity"

// Blueprints created from this surface are grouped under the same stable org key
// the capture front-door uses, so captures and their blueprint share an org.
const BLUEPRINT_ORG_ID = "kce-capture"

function archetypeChoices(
  t: TFunction
): { value: "" | BlueprintArchetype; label: string; hint: string }[] {
  return [
    {
      value: "",
      label: t("blueprint.archetype.auto", "Auto-detect"),
      hint: t("blueprint.archetype.autoHint", "Classify from the title"),
    },
    {
      value: "operational",
      label: t("blueprint.archetype.operational", "Operational"),
      hint: t("blueprint.archetype.operationalHint", "Hands-on / task-led"),
    },
    {
      value: "managerial",
      label: t("blueprint.archetype.managerial", "Managerial"),
      hint: t("blueprint.archetype.managerialHint", "Judgment + people"),
    },
    {
      value: "executive",
      label: t("blueprint.archetype.executive", "Executive"),
      hint: t("blueprint.archetype.executiveHint", "Strategy + relationships"),
    },
  ]
}

function progressStages(t: TFunction): string[] {
  return [
    t("blueprint.progress.reading", "Reading the role…"),
    t("blueprint.progress.classifying", "Classifying the role shape…"),
    t("blueprint.progress.drafting", "Drafting the knowledge areas…"),
    t("blueprint.progress.organizing", "Organizing the tree…"),
    t("blueprint.progress.finalizing", "Finalizing the blueprint…"),
  ]
}

// The page is a small state machine: create → review a fresh draft → done, plus
// a read-only view when an existing saved role is loaded.
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
  const { t } = useTranslation("kcPages")
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-border p-2.5"
      style={{ marginLeft: `${Math.min(node.depth, 6) * 20}px` }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        {onRename ? (
          <Input
            aria-label={t("blueprint.node.nameAria", { defaultValue: "Node {{ref}} name", ref: node.ref })}
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
          aria-label={t("blueprint.node.removeAria", { defaultValue: "Remove {{name}}", name: node.name })}
          onClick={() => onRemove(node.ref)}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ── Step 1: the generate form ────────────────────────────────────────────────

function makeFormSchema(t: TFunction) {
  return z.object({
    role_title: z
      .string()
      .min(1, t("blueprint.form.roleTitleRequired", "Name the role to blueprint"))
      .max(
        KCE_MAX_ROLE_TITLE,
        t("llmGuards.roleTitleTooLong", { max: KCE_MAX_ROLE_TITLE })
      ),
    context: z
      .string()
      .max(
        KCE_MAX_CONTEXT,
        t("llmGuards.contextTooLong", { max: KCE_MAX_CONTEXT.toLocaleString() })
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
  const { t } = useTranslation("kcPages")
  const generate = useGenerateBlueprint()
  const jobDnaList = useJobDnaList()
  const jobDnaSeed = useJobDnaSeed()
  const savedRoles = useSavedRoles(BLUEPRINT_ORG_ID)
  const loadSavedRole = useSavedRoleBlueprint(BLUEPRINT_ORG_ID)

  const { register, handleSubmit, control, setValue, getValues, watch, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(makeFormSchema(t)),
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

  // ── drafting progress (the generate is one LLM call; animate to 90% then snap
  //    to 100% on success so the user always sees it move + finish). ──
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
        t("blueprint.form.loadedToast", { defaultValue: "Loaded \"{{name}}\" — {{chars}} characters of context.", name: file.name, chars: text.length.toLocaleString() })
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("blueprint.form.readError", "Couldn't read that file.")
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
            t(
              "blueprint.form.draftedToast",
              { defaultValue: "Blueprint drafted — {{areas}} knowledge areas across {{sections}} sections.", areas: bp.nodes.length, sections: sectionCount(bp.nodes) }
            )
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
          <Wand2 className="h-5 w-5 text-primary" />
          {t("blueprint.form.title", "Blueprint a role")}
        </CardTitle>
        <CardDescription>
          <Trans
            i18nKey="blueprint.form.description"
            ns="kcPages"
            defaults="Draft the taxonomy of what a role <em>knows</em> — the map an expert interview should cover. Start from a title, an uploaded job description, or a saved role. You review and edit it before anything is saved."
            components={{ em: <em /> }}
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Load a saved role */}
          {savedRoles.isError && isKceAccessDenied(savedRoles.error) && <KceAccessInline />}
          {/* D-17 PR-B: any other failure used to hide the saved-role picker with no word. */}
          {savedRoles.isError && !isKceAccessDenied(savedRoles.error) && roles.length === 0 && (
            <div role="alert" data-testid="blueprint-roles-load-failed" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {t(
                  "blueprint.form.savedRolesLoadFailed",
                  "Your saved roles couldn't be loaded, so none are listed here. That is not the same as having none."
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void savedRoles.refetch()}
                disabled={savedRoles.isFetching}
              >
                {t("blueprint.form.savedRolesRetry", "Try again")}
              </Button>
            </div>
          )}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="saved_role">{t("blueprint.form.savedRole", "Role")}</Label>
              <select
                id="saved_role"
                defaultValue=""
                onChange={(e) => onPickSavedRole(e.target.value)}
                disabled={loadSavedRole.isPending}
                className={selectClass}
              >
                <option value="">{t("blueprint.form.newRoleOption", "Blueprint a new role…")}</option>
                {roles.map((r) => (
                  <option key={r.role_title} value={r.role_title}>
                    {t("blueprint.form.savedRoleOption", { defaultValue: "{{role}} ({{areas}} areas)", role: r.role_title, areas: r.node_count })}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {loadSavedRole.isPending
                  ? t("blueprint.form.loadingSaved", "Loading the saved blueprint…")
                  : t(
                      "blueprint.form.savedRoleHint",
                      "Pick a role you've already blueprinted to view it and start a capture, or leave it to draft a new one below."
                    )}
              </p>
            </div>
          )}

          {/* Upload a role document */}
          <div className="space-y-2">
            <Label>
              {t("blueprint.form.uploadLabel", "Upload a role")}{" "}
              <span className="text-muted-foreground">
                {t("blueprint.form.uploadOptional", "(optional — Word, PDF, or text)")}
              </span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                onChange={onFileChosen}
                className="hidden"
                aria-label={t("blueprint.form.uploadAria", "Upload a role document")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("blueprint.form.reading", "Reading…")}</>
                ) : (
                  <><FileUp className="mr-2 h-4 w-4" /> {t("blueprint.form.uploadButton", "Upload a role")}</>
                )}
              </Button>
              {uploadName && !extracting && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {uploadName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "blueprint.form.uploadHint",
                "Drop in a job description or role charter — we read the text into the context below and guess the title. Nothing is uploaded to a server."
              )}
            </p>
          </div>

          {/* Seed from a Job Blueprint */}
          <div className="space-y-2">
            <Label htmlFor="job_dna_seed">
              {t("blueprint.form.seedLabel", "Seed from a role blueprint")}{" "}
              <span className="text-muted-foreground">{t("blueprint.form.optional", "(optional)")}</span>
            </Label>
            <select
              id="job_dna_seed"
              value={selectedJobDnaId}
              onChange={(e) => onPickJobDna(e.target.value)}
              disabled={jobDnaList.isLoading || jobDnaSeed.isPending}
              className={selectClass}
            >
              <option value="">{t("blueprint.form.seedNone", "Start from a role title instead")}</option>
              {(jobDnaList.data ?? []).map((jd) => (
                <option key={jd.id} value={jd.id}>{jd.roleTitle}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {jobDnaSeed.isPending
                ? t("blueprint.form.loadingSeed", "Loading the blueprint's knowledge seed…")
                : t(
                    "blueprint.form.seedHint",
                    "Pick a role blueprint to seed the map from its role knowledge — Maven then enriches it."
                  )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_title">{t("blueprint.form.roleTitle", "Role title")}</Label>
            <Input
              id="role_title"
              placeholder={t("blueprint.form.roleTitlePlaceholder", "e.g. Senior Wastewater Treatment Operator, or CIO")}
              maxLength={KCE_MAX_ROLE_TITLE}
              {...register("role_title")}
            />
            {errors.role_title && (
              <p className="text-sm text-destructive">{errors.role_title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">
              {t("blueprint.form.context", "Context")}{" "}
              <span className="text-muted-foreground">{t("blueprint.form.optional", "(optional)")}</span>
            </Label>
            <Textarea
              id="context"
              rows={4}
              placeholder={t(
                "blueprint.form.contextPlaceholder",
                "Paste a job description, or a few lines on what makes this role hard to hand over. (An uploaded file fills this in.)"
              )}
              {...register("context")}
            />
            {(contextOver || errors.context) && (
              <p className="text-sm text-destructive">
                {t("llmGuards.contextTooLong", { max: KCE_MAX_CONTEXT.toLocaleString() })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("blueprint.form.roleShape", "Role shape")}</Label>
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
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
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
                "blueprint.form.roleShapeHint",
                "The shape decides which of the 8 knowledge sections lead — an executive's tree is judgment and relationships, not a task list."
              )}
            </p>
          </div>

          {/* Draft button + progress */}
          {drafting ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <Progress value={progress} aria-label={t("blueprint.form.draftingAria", "Drafting the blueprint")} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMsg} <span className="tabular-nums">({Math.round(progress)}%)</span>
              </div>
            </div>
          ) : (
            <Button type="submit" className="w-full" disabled={contextOver}>
              <Sparkles className="mr-2 h-4 w-4" /> {t("blueprint.form.draftButton", "Draft the blueprint")}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

// ── Step 2: review + edit a freshly drafted tree ─────────────────────────────

function ReviewStep({
  blueprint,
  onStartOver,
  onSaved,
}: {
  blueprint: BlueprintGenerateResponse
  onStartOver: () => void
  onSaved: (roleTitle: string, created: number) => void
}) {
  const { t } = useTranslation("kcPages")
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
      toast.error(t("blueprint.review.nothingToSave", "Nothing to save — add or keep at least one node."))
      return
    }
    persist.mutate(
      { org_id: BLUEPRINT_ORG_ID, role_title: blueprint.role_title, nodes: clean },
      {
        onSuccess: (res) => {
          toast.success(
            t("blueprint.review.savedToast", { defaultValue: "Saved \"{{role}}\" — {{areas}} knowledge areas.", role: blueprint.role_title, areas: res.created })
          )
          onSaved(blueprint.role_title, res.created)
        },
      }
    )
  }

  return (
    <div className="space-y-5">
      {/* Completion summary — unmistakable that the draft finished. */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <div className="font-semibold">{t("blueprint.review.drafted", "Blueprint drafted")}</div>
              <div className="text-sm text-muted-foreground">
                <Trans
                  i18nKey="blueprint.review.summary"
                  ns="kcPages"
                  defaults="{{areas}} knowledge areas across {{sections}} sections · <shape>{{archetype}}</shape> shape · review and edit below, then save."
                  values={{
                    areas: keepCount,
                    sections: sectionCount(nodes),
                    archetype: blueprint.archetype,
                  }}
                  components={{ shape: <span className="capitalize" /> }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            {blueprint.role_title}
          </CardTitle>
          <CardDescription className="mt-1">
            {t(
              "blueprint.review.rationale",
              { defaultValue: "{{rationale}}. Rename or remove anything — nothing is stored until you save.", rationale: blueprint.archetype_rationale }
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayNodes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("blueprint.review.allRemoved", "Every node was removed. Start over to draft a fresh blueprint.")}
            </p>
          )}
          {displayNodes.map((node) => (
            <NodeRow key={node.ref} node={node} onRename={renameNode} onRemove={removeNode} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" /> {t("blueprint.review.startOver", "Start over")}
        </Button>
        <Button type="button" onClick={approve} disabled={persist.isPending || displayNodes.length === 0}>
          {persist.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("blueprint.review.saving", "Saving…")}</>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("blueprint.review.saveButton", { defaultValue: "Save role & {{areas}} knowledge areas", areas: keepCount })}
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
  const navigate = useNavigate()
  const { t } = useTranslation("kcPages")
  const displayNodes = useMemo(() => buildDisplayOrder(blueprint.nodes), [blueprint.nodes])
  return (
    <div className="space-y-5">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <div className="font-semibold">{blueprint.role_title}</div>
              <div className="text-sm text-muted-foreground">
                {t("blueprint.saved.summary", { defaultValue: "Saved blueprint · {{areas}} knowledge areas. Ready to capture against.", areas: blueprint.nodes.length })}
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={() =>
              navigate(
                `${ROUTES.KNOWLEDGE_CONTINUITY.CAPTURE}?role=${encodeURIComponent(blueprint.role_title)}`
              )
            }
          >
            <MessagesSquare className="mr-2 h-4 w-4" /> {t("blueprint.saved.startCapture", "Start a capture")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          {displayNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("blueprint.saved.noAreas", "This role has no saved knowledge areas.")}
            </p>
          ) : (
            displayNodes.map((node) => <NodeRow key={node.ref} node={node} />)
          )}
        </CardContent>
      </Card>

      <Button type="button" variant="ghost" onClick={onBack}>
        <RotateCcw className="mr-2 h-4 w-4" /> {t("blueprint.saved.another", "Blueprint another role")}
      </Button>
    </div>
  )
}

// ── Step 3: done — saved, with next-step guidance ────────────────────────────

function DoneStep({
  roleTitle,
  created,
  onBlueprintAnother,
}: {
  roleTitle: string
  created: number
  onBlueprintAnother: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation("kcPages")
  return (
    <Card>
      <CardContent className="space-y-6 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">{t("blueprint.done.title", { defaultValue: "Saved “{{role}}”", role: roleTitle })}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("blueprint.done.summary", { defaultValue: "{{areas}} knowledge areas are saved and ready. Here's what to do next.", areas: created })}
          </p>
        </div>

        <div className="mx-auto grid max-w-md gap-3 text-left">
          <button
            type="button"
            onClick={() =>
              navigate(
                `${ROUTES.KNOWLEDGE_CONTINUITY.CAPTURE}?role=${encodeURIComponent(roleTitle)}`
              )
            }
            className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <MessagesSquare className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {t("blueprint.done.startCapture", "Start a capture")}{" "}
                <span className="text-muted-foreground">{t("blueprint.done.recommended", "(recommended)")}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "blueprint.done.startCaptureHint",
                  "Interview an expert against this role — Maven asks, Sage extracts the knowledge."
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={onBlueprintAnother}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50"
          >
            <Wand2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{t("blueprint.saved.another", "Blueprint another role")}</div>
              <div className="text-xs text-muted-foreground">
                {t("blueprint.done.anotherHint", "Map out the next role at risk.")}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.KNOWLEDGE_CONTINUITY.DASHBOARD)}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50"
          >
            <BookOpenCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{t("blueprint.done.seeHealth", "See Program Health")}</div>
              <div className="text-xs text-muted-foreground">
                {t("blueprint.done.seeHealthHint", "Coverage, freshness, and roles at risk.")}
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function KceBlueprintPage() {
  const { t } = useTranslation("kcPages")
  const [view, setView] = useState<View>({ step: "form" })

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("blueprint.title", "Blueprint a role")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t(
            "blueprint.subtitle",
            "Auto-draft the knowledge map for a role, edit it, and save it — then run a capture against it. This replaces hand-authoring taxonomy nodes one by one."
          )}
        </p>
      </div>

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
