import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
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
import { FitPageHeader } from "./_shared"

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

const ARCHETYPE_CHOICES: { value: "" | BlueprintArchetype; label: string; hint: string }[] = [
  { value: "", label: "Auto-detect", hint: "Classify from the title" },
  { value: "operational", label: "Operational", hint: "Hands-on / task-led" },
  { value: "managerial", label: "Managerial", hint: "Judgment + people" },
  { value: "executive", label: "Executive", hint: "Strategy + relationships" },
]

const PROGRESS_STAGES = [
  "Reading the role…",
  "Classifying the role shape…",
  "Drafting the knowledge areas…",
  "Organizing the tree…",
  "Finalizing the blueprint…",
]

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
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-border p-2.5"
      style={{ marginLeft: `${Math.min(node.depth, 6) * 20}px` }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        {onRename ? (
          <Input
            aria-label={`Node ${node.ref} name`}
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
          aria-label={`Remove ${node.name}`}
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

const formSchema = z.object({
  role_title: z.string().min(1, "Name the role you want to be measured against"),
  context: z.string().optional(),
  archetype: z.enum(["", "operational", "managerial", "executive"]),
})

type FormValues = z.infer<typeof formSchema>

function FormStep({
  onDrafted,
  onLoadedSaved,
}: {
  onDrafted: (bp: BlueprintGenerateResponse) => void
  onLoadedSaved: (bp: SavedRoleBlueprint) => void
}) {
  const generate = useGenerateBlueprint()
  const jobDnaList = useJobDnaList()
  const jobDnaSeed = useJobDnaSeed()
  const savedRoles = useSavedRoles(BLUEPRINT_ORG_ID)
  const loadSavedRole = useSavedRoleBlueprint(BLUEPRINT_ORG_ID)

  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: { role_title: "", context: "", archetype: "" },
    })

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
        toast.success(`Seeded from "${seed.roleTitle}" — ${seed.nodes.length} areas from its Job DNA.`)
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
            `Blueprint drafted — ${bp.nodes.length} knowledge areas across ${sectionCount(bp.nodes)} sections.`
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
          Blueprint a role
        </CardTitle>
        <CardDescription>
          Define the role you want to be measured against. Start from a saved role, a Job Blueprint
          someone has already authored, an uploaded job posting, or a plain description — then review
          the draft before anything is saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Saved roles */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="saved_role">Role</Label>
              <select
                id="saved_role"
                defaultValue=""
                onChange={(e) => onPickSavedRole(e.target.value)}
                disabled={loadSavedRole.isPending}
                className={selectClass}
              >
                <option value="">Blueprint a new role…</option>
                {roles.map((r) => (
                  <option key={r.role_title} value={r.role_title}>
                    {r.role_title} ({r.node_count} areas)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {loadSavedRole.isPending
                  ? "Loading the saved blueprint…"
                  : "Pick a role you've already blueprinted to see your fit against it, or leave it to draft a new one."}
              </p>
            </div>
          )}

          {/* Existing Job DNA / Job Blueprints authored elsewhere */}
          <div className="space-y-2">
            <Label htmlFor="job_dna_seed">
              Use an existing Job Blueprint <span className="text-muted-foreground">(optional)</span>
            </Label>
            <select
              id="job_dna_seed"
              value={selectedJobDnaId}
              onChange={(e) => onPickJobDna(e.target.value)}
              disabled={jobDnaList.isLoading || jobDnaSeed.isPending}
              className={selectClass}
            >
              <option value="">Start from a role title instead</option>
              {(jobDnaList.data ?? []).map((jd) => (
                <option key={jd.id} value={jd.id}>{jd.roleTitle}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {jobDnaSeed.isPending
                ? "Loading the blueprint's knowledge seed…"
                : "Roles already authored in Job DNA — picking one seeds this blueprint from its completed DNA."}
            </p>
          </div>

          {/* Upload a job posting */}
          <div className="space-y-2">
            <Label>
              Upload a job posting{" "}
              <span className="text-muted-foreground">(optional — Word, PDF, or text)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_ROLE_FILE_TYPES}
                onChange={onFileChosen}
                className="hidden"
                aria-label="Upload a job posting"
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
                  <><FileUp className="mr-2 h-4 w-4" /> Upload a job posting</>
                )}
              </Button>
              {uploadName && !extracting && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[#0D9488]" /> {uploadName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Drop in the posting or job description — we read the text into the description below and
              guess the title. Nothing is uploaded to a server.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_title">Role title</Label>
            <Input
              id="role_title"
              placeholder="e.g. Director of Operations, or Senior Product Manager"
              {...register("role_title")}
            />
            {errors.role_title && (
              <p className="text-sm text-destructive">{errors.role_title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">
              Describe the role <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="context"
              rows={4}
              placeholder="Paste the job posting, or describe what the role actually involves. (An uploaded file fills this in.)"
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
              The shape decides which knowledge sections lead — an executive role is measured on
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
      toast.error("Nothing to save — add or keep at least one node.")
      return
    }
    persist.mutate(
      { org_id: BLUEPRINT_ORG_ID, role_title: blueprint.role_title, nodes: clean },
      {
        onSuccess: (res) => {
          toast.success(`Saved "${blueprint.role_title}" — ${res.created} knowledge areas.`)
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
              <div className="font-semibold">Blueprint drafted</div>
              <div className="text-sm text-muted-foreground">
                {keepCount} knowledge areas across {sectionCount(nodes)} sections ·{" "}
                <span className="capitalize">{blueprint.archetype}</span> shape · review and edit
                below, then save to measure yourself against it.
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
            {blueprint.archetype_rationale}. Rename or remove anything — nothing is stored until you
            save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayNodes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Every node was removed. Start over to draft a fresh blueprint.
            </p>
          )}
          {displayNodes.map((node) => (
            <NodeRow key={node.ref} node={node} onRename={renameNode} onRemove={removeNode} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" /> Start over
        </Button>
        <Button
          type="button"
          onClick={approve}
          disabled={persist.isPending || displayNodes.length === 0}
        >
          {persist.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save role &amp; {keepCount} knowledge areas
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
                Saved blueprint · {blueprint.nodes.length} knowledge areas. Ready to measure yourself
                against.
              </div>
            </div>
          </div>
          <Button type="button" onClick={() => navigate(ROUTES.JOB_FIT.MATCHES)}>
            <ScanSearch className="mr-2 h-4 w-4" /> See my fit
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          {displayNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">This role has no saved knowledge areas.</p>
          ) : (
            displayNodes.map((node) => <NodeRow key={node.ref} node={node} />)
          )}
        </CardContent>
      </Card>

      <Button type="button" variant="ghost" onClick={onBack}>
        <RotateCcw className="mr-2 h-4 w-4" /> Blueprint another role
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
  const navigate = useNavigate()
  return (
    <Card>
      <CardContent className="space-y-6 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-12 w-12 text-[#0D9488]" />
          <h2 className="text-xl font-semibold">Saved “{roleTitle}”</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {created} knowledge areas are saved. Now find out how you measure against them.
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
                See my fit <span className="text-muted-foreground">(recommended)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                How your profile lines up against this role, area by area.
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
              <div className="text-sm font-semibold">Show me the gaps</div>
              <div className="text-xs text-muted-foreground">
                What's missing, and which gaps are worth closing first.
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
              <div className="text-sm font-semibold">Plan the pathway</div>
              <div className="text-xs text-muted-foreground">Turn the gaps into a route to the role.</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onBlueprintAnother}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-[#0D9488]/50"
          >
            <Wand2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Blueprint another role</div>
              <div className="text-xs text-muted-foreground">Compare yourself against a second target.</div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BlueprintStudioPage() {
  const [view, setView] = useState<View>({ step: "form" })

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <FitPageHeader
        icon={Wand2}
        title="Blueprint a role"
        description="Define the role you're aiming at — from a saved role, an existing Job Blueprint, an uploaded posting, or a description. Job Fit measures you against it."
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
