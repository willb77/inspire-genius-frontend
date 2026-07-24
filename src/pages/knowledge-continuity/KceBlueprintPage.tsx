import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Loader2,
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
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useGenerateBlueprint } from "@/hooks/knowledge-continuity/useGenerateBlueprint"
import { usePersistBlueprint } from "@/hooks/knowledge-continuity/usePersistBlueprint"
import type {
  BlueprintArchetype,
  BlueprintGenerateResponse,
  BlueprintNode,
} from "@/types/knowledge-continuity"

// Blueprints created from this surface are grouped under the same stable org key
// the capture front-door uses, so captures and their blueprint share an org.
const BLUEPRINT_ORG_ID = "kce-capture"

type Step = "form" | "review"

const ARCHETYPE_CHOICES: { value: "" | BlueprintArchetype; label: string; hint: string }[] = [
  { value: "", label: "Auto-detect", hint: "Classify from the title" },
  { value: "operational", label: "Operational", hint: "Hands-on / task-led" },
  { value: "managerial", label: "Managerial", hint: "Judgment + people" },
  { value: "executive", label: "Executive", hint: "Strategy + relationships" },
]

// ── Step 1: the generate form ──────────────────────────────────────────────

const formSchema = z.object({
  role_title: z.string().min(1, "Name the role to blueprint"),
  context: z.string().optional(),
  archetype: z.enum(["", "operational", "managerial", "executive"]),
})

type FormValues = z.infer<typeof formSchema>

function FormStep({ onDrafted }: { onDrafted: (bp: BlueprintGenerateResponse) => void }) {
  const generate = useGenerateBlueprint()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { role_title: "", context: "", archetype: "" },
  })

  const onSubmit = (values: FormValues) => {
    generate.mutate(
      {
        role_title: values.role_title.trim(),
        context: values.context?.trim() || undefined,
        archetype: values.archetype || undefined,
      },
      { onSuccess: onDrafted }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Blueprint a role
        </CardTitle>
        <CardDescription>
          Draft the taxonomy of what a role <em>knows</em> — the map an expert interview should
          cover. You review and edit it before anything is saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="role_title">Role</Label>
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
            <Label htmlFor="context">
              Context <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="context"
              rows={3}
              placeholder="Paste a job description, or a few lines on what makes this role hard to hand over."
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
              The shape decides which of the 8 knowledge sections lead — an executive's tree is
              judgment and relationships, not a task list.
            </p>
          </div>

          <Button type="submit" disabled={generate.isPending} className="w-full">
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting the blueprint…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Draft the blueprint
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2: review + edit the drafted tree ──────────────────────────────────

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
  // Any node whose parent was pruned (orphan) still gets shown at the end.
  if (out.length < nodes.length) {
    const shown = new Set(out.map((n) => n.ref))
    for (const n of nodes) if (!shown.has(n.ref)) out.push(n)
  }
  return out
}

function ReviewStep({
  blueprint,
  onStartOver,
}: {
  blueprint: BlueprintGenerateResponse
  onStartOver: () => void
}) {
  const navigate = useNavigate()
  const persist = usePersistBlueprint()
  const [nodes, setNodes] = useState<BlueprintNode[]>(blueprint.nodes)

  const displayNodes = useMemo(() => buildDisplayOrder(nodes), [nodes])

  const renameNode = (ref: string, name: string) =>
    setNodes((prev) => prev.map((n) => (n.ref === ref ? { ...n, name } : n)))

  const removeNode = (ref: string) =>
    setNodes((prev) => {
      // remove the node and every descendant
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
          toast.success(`Blueprint saved — ${res.created} knowledge areas ready to capture.`)
          navigate(ROUTES.KNOWLEDGE_CONTINUITY.CAPTURE)
        },
      }
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                {blueprint.role_title}
              </CardTitle>
              <CardDescription className="mt-1">
                Draft blueprint · review, edit, then save. Nothing is stored until you approve.
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="capitalize">
                {blueprint.archetype} shape
              </Badge>
              <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                {blueprint.archetype_rationale}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayNodes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Every node was removed. Start over to draft a fresh blueprint.
            </p>
          )}
          {displayNodes.map((node) => (
            <div
              key={node.ref}
              className="flex items-start gap-2 rounded-lg border border-border p-2.5"
              style={{ marginLeft: `${Math.min(node.depth, 6) * 20}px` }}
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  aria-label={`Node ${node.ref} name`}
                  value={node.name}
                  onChange={(e) => renameNode(node.ref, e.target.value)}
                  className="h-8 text-sm font-medium"
                />
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${node.name}`}
                onClick={() => removeNode(node.ref)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve &amp; create {nodes.filter((n) => n.name.trim()).length} nodes
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function KceBlueprintPage() {
  const [step, setStep] = useState<Step>("form")
  const [blueprint, setBlueprint] = useState<BlueprintGenerateResponse | null>(null)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blueprint a role</h1>
        <p className="mt-1 text-muted-foreground">
          Auto-draft the knowledge map for a role, edit it, and save it — then run a capture
          against it. This replaces hand-authoring taxonomy nodes one by one.
        </p>
      </div>

      {step === "form" || !blueprint ? (
        <FormStep
          onDrafted={(bp) => {
            setBlueprint(bp)
            setStep("review")
          }}
        />
      ) : (
        <ReviewStep
          blueprint={blueprint}
          onStartOver={() => {
            setBlueprint(null)
            setStep("form")
          }}
        />
      )}
    </div>
  )
}
