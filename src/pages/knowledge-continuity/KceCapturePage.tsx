import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ROUTES } from "@/constants/routes"
import { useSavedRoles } from "@/hooks/knowledge-continuity/useSavedRoles"
import { useSavedRoleBlueprint } from "@/hooks/knowledge-continuity/useSavedRoleBlueprint"
import { useStartCaptureSession } from "@/hooks/knowledge-continuity/useStartCaptureSession"
import { useNextQuestion } from "@/hooks/knowledge-continuity/useNextQuestion"
import { useRecordTurn } from "@/hooks/knowledge-continuity/useRecordTurn"
import { useExtractUnits } from "@/hooks/knowledge-continuity/useExtractUnits"
import { useSynthesizeUnits } from "@/hooks/knowledge-continuity/useSynthesizeUnits"
import type {
  BlueprintNode,
  ExtractedUnit,
  SavedRoleBlueprint,
  TranscriptExchange,
} from "@/types/knowledge-continuity"

// Capture sessions started from this front door are grouped under a stable
// org key — the AuthUser carries no organization, and the Reviewer Console's
// intake form likewise takes org_id as a plain field.
const CAPTURE_ORG_ID = "kce-capture"

type View = "choose" | "plan" | "interview" | "done"

/** How the expert is being captured — collected once, reused for the session. */
type ExpertConfig = {
  expertName: string
  realExpert: boolean
  consentId: string
}

// A saved role's blueprint node carries the REAL taxonomy node id in `ref`
// (the reload route maps node.id → ref), so we capture each area against its
// own node with correct linkage — no fresh node minting.
function rootTaxonomyId(nodes: BlueprintNode[]): string | null {
  const root = nodes.find((n) => !n.parent_ref) ?? nodes[0]
  return root?.ref ?? null
}

// ── How-it-works explainer (the "what do I do next" the flow was missing) ──────

function HowItWorks() {
  const steps = [
    { icon: MessagesSquare, label: "Interview", text: "Maven interviews the expert, one area at a time." },
    { icon: Sparkles, label: "Extract", text: "Sage turns each answer into typed knowledge units." },
    { icon: BookOpenCheck, label: "Validate", text: "Units are scored and sent to the Reviewer Console." },
    { icon: GraduationCap, label: "Transfer", text: "Validated knowledge becomes the successor's training." },
  ]
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">How a capture works</CardTitle>
        <CardDescription>
          You interview the person who holds the role. What they know becomes validated,
          reusable training for whoever comes next — and a lasting record of the role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <s.icon className="h-3.5 w-3.5 text-[#127A8A]" />
                  {s.label}
                </div>
                <p className="text-xs text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

// ── Choose which saved role to capture (fallback when no ?role= is passed) ─────

function ChooseRoleStep({ onPick }: { onPick: (roleTitle: string) => void }) {
  const navigate = useNavigate()
  const { data: roles = [], isLoading } = useSavedRoles(CAPTURE_ORG_ID)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pick a role to capture</CardTitle>
        <CardDescription>
          Capture runs against a role you've already blueprinted. Choose one below, or blueprint
          a new role first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved roles…
          </div>
        ) : roles.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No saved roles yet. Blueprint a role first — it maps the knowledge areas this
              capture will walk through.
            </p>
            <Button onClick={() => navigate(ROUTES.KNOWLEDGE_CONTINUITY.BLUEPRINT)} className="gap-1.5">
              <Wand2 className="h-4 w-4" /> Blueprint a role
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {roles.map((role) => (
              <li key={role.taxonomy_id}>
                <button
                  type="button"
                  onClick={() => onPick(role.role_title)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{role.role_title}</div>
                    <div className="text-xs text-muted-foreground">
                      {role.node_count} knowledge areas
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ── The capture plan: the blueprint's areas, status + progress ─────────────────

function PlanStep({
  blueprint,
  expert,
  setExpert,
  capturedRefs,
  starting,
  onCaptureArea,
  onFinish,
  finishing,
}: {
  blueprint: SavedRoleBlueprint
  expert: ExpertConfig
  setExpert: (e: ExpertConfig) => void
  capturedRefs: Set<string>
  starting: boolean
  onCaptureArea: (node: BlueprintNode) => void
  onFinish: () => void
  finishing: boolean
}) {
  const areas = blueprint.nodes
  const capturedCount = areas.filter((n) => capturedRefs.has(n.ref)).length
  const pct = areas.length ? Math.round((capturedCount / areas.length) * 100) : 0
  const expertReady = expert.expertName.trim().length > 0 && (!expert.realExpert || expert.consentId.trim().length > 0)

  return (
    <div className="space-y-5">
      <HowItWorks />

      {/* Who's being captured */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Who are we capturing?</CardTitle>
          <CardDescription>
            Set this once — it applies to every area you capture in this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="expert-name">Expert</Label>
            <Input
              id="expert-name"
              value={expert.expertName}
              onChange={(e) => setExpert({ ...expert, expertName: e.target.value })}
              placeholder="Name of the person who holds this role"
              disabled={capturedCount > 0}
            />
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="real-expert"
              checked={expert.realExpert}
              onCheckedChange={(c) => setExpert({ ...expert, realExpert: c === true })}
              disabled={capturedCount > 0}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="real-expert" className="font-medium">
                This is a real expert (not a practice run)
              </Label>
              <p className="text-xs text-muted-foreground">
                Real captures need a consent record on file. Leave off for a practice/volunteer run.
              </p>
            </div>
          </div>
          {expert.realExpert && (
            <div className="space-y-1.5">
              <Label htmlFor="consent-id">Consent record id</Label>
              <Input
                id="consent-id"
                value={expert.consentId}
                onChange={(e) => setExpert({ ...expert, consentId: e.target.value })}
                placeholder="The id of the signed consent on file"
                disabled={capturedCount > 0}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* The areas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-[#127A8A]" />
            {blueprint.role_title} — capture plan
          </CardTitle>
          <CardDescription>
            Work through the role's knowledge areas. Capture as many as the expert has time for —
            you can come back and finish the rest later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{capturedCount} of {areas.length} areas captured</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>

          {!expertReady && (
            <p className="text-xs text-muted-foreground">
              Enter who you're capturing above to begin.
            </p>
          )}

          <ul className="space-y-2">
            {areas.map((node) => {
              const done = capturedRefs.has(node.ref)
              return (
                <li
                  key={node.ref}
                  className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2"
                  style={{ marginLeft: Math.min(node.depth, 3) * 16 }}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <MessagesSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{node.name}</div>
                    {node.section && (
                      <Badge variant="outline" className="mt-0.5 bg-slate-50 text-[11px] text-slate-600">
                        {node.section}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={done ? "outline" : "default"}
                    disabled={!expertReady || starting}
                    onClick={() => onCaptureArea(node)}
                    className="gap-1.5"
                  >
                    {starting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : done ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    {done ? "Re-capture" : "Capture"}
                  </Button>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={onFinish} disabled={capturedCount === 0 || finishing} className="gap-1.5">
          {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Finish &amp; see the outcome
        </Button>
        {capturedCount === 0 && (
          <p className="text-xs text-muted-foreground">Capture at least one area to finish.</p>
        )}
      </div>
    </div>
  )
}

// ── The interview for one area (Maven Q&A) ─────────────────────────────────────

function InterviewStep({
  roleTitle,
  node,
  sessionId,
  onFinishArea,
  onCancel,
  isFinishing,
}: {
  roleTitle: string
  node: BlueprintNode
  sessionId: string
  onFinishArea: (transcript: TranscriptExchange[]) => void
  onCancel: () => void
  isFinishing: boolean
}) {
  const nextQuestion = useNextQuestion()
  const recordTurn = useRecordTurn()

  const [transcript, setTranscript] = useState<TranscriptExchange[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [coverageNote, setCoverageNote] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState("")
  const firstRequested = useRef(false)

  const captureNode = { name: node.name, node_type: node.node_type }

  function applyQuestion(data: { question: string; coverage_note: string | null }) {
    setPendingQuestion(data.question)
    setCoverageNote(data.coverage_note)
  }

  useEffect(() => {
    if (firstRequested.current) return
    firstRequested.current = true
    nextQuestion.mutate(
      { role_title: roleTitle, node: captureNode, transcript: [], is_first: true },
      { onSuccess: applyQuestion }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submitAnswer() {
    const answer = answerText.trim()
    if (!pendingQuestion || answer.length === 0 || nextQuestion.isPending) return

    const exchange: TranscriptExchange = { question: pendingQuestion, answer }
    const nextTranscript = [...transcript, exchange]
    setTranscript(nextTranscript)
    setPendingQuestion(null)
    setCoverageNote(null)
    setAnswerText("")

    recordTurn.mutate({
      sessionId,
      body: { taxonomy_node_id: node.ref, question: exchange.question, response: exchange.answer },
    })

    nextQuestion.mutate(
      { role_title: roleTitle, node: captureNode, transcript: nextTranscript, is_first: false },
      { onSuccess: applyQuestion }
    )
  }

  function retryQuestion() {
    nextQuestion.mutate(
      { role_title: roleTitle, node: captureNode, transcript, is_first: transcript.length === 0 },
      { onSuccess: applyQuestion }
    )
  }

  const waitingForQuestion = nextQuestion.isPending
  const questionFailed = nextQuestion.isError && !pendingQuestion && !waitingForQuestion
  const canFinish = transcript.length >= 1 && !isFinishing

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{node.name}</CardTitle>
          <CardDescription>
            {roleTitle} · Answer in your own words. Maven follows up on what you say.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {transcript.length > 0 && (
            <ul className="space-y-4">
              {transcript.map((exchange, i) => (
                <li key={i} className="space-y-2">
                  <div className="flex gap-2">
                    <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#127A8A]" />
                    <p className="text-sm font-medium text-foreground">{exchange.question}</p>
                  </div>
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-foreground">
                    {exchange.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {waitingForQuestion && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Maven is thinking…
            </div>
          )}

          {questionFailed && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">Something went wrong getting the next question.</p>
              <Button size="sm" variant="outline" onClick={retryQuestion} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
            </div>
          )}

          {pendingQuestion && !waitingForQuestion && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#127A8A]" />
                <p className="text-sm font-medium text-foreground">{pendingQuestion}</p>
              </div>
              {coverageNote && (
                <p className="pl-6 text-xs italic text-muted-foreground">{coverageNote}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="capture-answer" className="sr-only">Your answer</Label>
                <Textarea
                  id="capture-answer"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer…"
                  rows={4}
                />
                <Button onClick={submitAnswer} disabled={answerText.trim().length === 0} className="gap-1.5">
                  <Send className="h-4 w-4" /> Send answer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => onFinishArea(transcript)} disabled={!canFinish} className="gap-1.5">
          {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save this area
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={isFinishing}>
          Back to plan
        </Button>
        {transcript.length === 0 && (
          <p className="text-xs text-muted-foreground">Answer at least one question to save this area.</p>
        )}
      </div>
    </div>
  )
}

// ── Outcome ────────────────────────────────────────────────────────────────────

function DoneStep({
  roleTitle,
  units,
  areasCaptured,
  onRestart,
}: {
  roleTitle: string
  units: ExtractedUnit[]
  areasCaptured: number
  onRestart: () => void
}) {
  const navigate = useNavigate()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-[#127A8A]" />
          Capture complete — {roleTitle}
        </CardTitle>
        <CardDescription>
          {units.length} knowledge {units.length === 1 ? "unit" : "units"} captured across{" "}
          {areasCaptured} {areasCaptured === 1 ? "area" : "areas"} and sent for review. Here's what
          happens next.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {units.length > 0 && (
          <ul className="space-y-2">
            {units.map((unit, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">
                  {unit.category}
                </Badge>
                <span className="text-foreground">{unit.title}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.KNOWLEDGE_CONTINUITY.REVIEW)}
            className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <BookOpenCheck className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                Review &amp; validate <span className="text-muted-foreground">(next step)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Confirm, amend, or reject each unit. Validated knowledge is what successors are taught.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.KNOWLEDGE_CONTINUITY.CURRICULUM)}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50"
          >
            <GraduationCap className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Build the successor's training</div>
              <div className="text-xs text-muted-foreground">
                Turn validated knowledge into a wiring-adapted learning path for the next person.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <Button variant="outline" onClick={onRestart} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Capture more of this role
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

/**
 * Knowledge Continuity vertical — the "Start a capture" front door.
 *
 * Blueprint-driven: arriving from a role's blueprint (`?role=<title>`), it loads
 * that role's saved knowledge areas and walks the expert through them, one area
 * at a time — Maven interviews, Sage extracts, the trainer-service scores each
 * unit and sends it to the Reviewer Console. Without a role it offers a saved-
 * role picker. All captured areas share ONE session; a saved role's blueprint
 * node carries the real taxonomy id in `ref`, so each area links correctly.
 *
 * Renders inside the shared AppShell via KceLayout (entitlement already gated).
 * Deliberately plain language: no raw PRISM dimension names surfaced.
 */
export default function KceCapturePage() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get("role")?.trim() || null

  const [view, setView] = useState<View>(roleParam ? "plan" : "choose")
  const [roleTitle, setRoleTitle] = useState<string | null>(roleParam)
  const [blueprint, setBlueprint] = useState<SavedRoleBlueprint | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expert, setExpert] = useState<ExpertConfig>({
    expertName: "",
    realExpert: false,
    consentId: "",
  })
  const [capturedRefs, setCapturedRefs] = useState<Set<string>>(new Set())
  const [allUnits, setAllUnits] = useState<ExtractedUnit[]>([])
  const [activeNode, setActiveNode] = useState<BlueprintNode | null>(null)

  const loadBlueprint = useSavedRoleBlueprint(CAPTURE_ORG_ID)
  const startSession = useStartCaptureSession()
  const extractUnits = useExtractUnits()
  const synthesize = useSynthesizeUnits()

  const loadBlueprintMutate = loadBlueprint.mutate
  const isFinishingArea = extractUnits.isPending || synthesize.isPending

  // Load the blueprint whenever a role is chosen (from ?role= or the picker).
  useEffect(() => {
    if (!roleTitle) return
    loadBlueprintMutate(roleTitle, {
      onSuccess: (bp) => {
        setBlueprint(bp)
        setView("plan")
      },
      onError: () => setView("choose"),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleTitle])

  // Ensure a session exists (created lazily on the first area), then interview.
  async function captureArea(node: BlueprintNode) {
    if (!roleTitle || !blueprint) return
    try {
      let sid = sessionId
      if (!sid) {
        const session = await startSession.mutateAsync({
          org_id: CAPTURE_ORG_ID,
          expert_user_id: expert.expertName.trim(),
          role_title: roleTitle,
          is_synthetic: !expert.realExpert,
          consent_event_id: expert.realExpert ? expert.consentId.trim() || undefined : undefined,
          taxonomy_id: rootTaxonomyId(blueprint.nodes) ?? undefined,
        })
        sid = session.id
        setSessionId(sid)
      }
      setActiveNode(node)
      setView("interview")
    } catch {
      // consent 403 / network already toasted by the hook — stay on the plan.
    }
  }

  async function finishArea(transcript: TranscriptExchange[]) {
    if (!roleTitle || !sessionId || !activeNode) return
    try {
      const extracted = await extractUnits.mutateAsync({
        role_title: roleTitle,
        node: { name: activeNode.name, node_type: activeNode.node_type },
        taxonomy_node_id: activeNode.ref,
        transcript,
      })
      await synthesize.mutateAsync({ sessionId, units: extracted.units })
      setAllUnits((prev) => [...prev, ...extracted.units])
      setCapturedRefs((prev) => new Set(prev).add(activeNode.ref))
      toast.success(
        extracted.units.length === 1
          ? `1 unit captured from "${activeNode.name}"`
          : `${extracted.units.length} units captured from "${activeNode.name}"`
      )
      setActiveNode(null)
      setView("plan")
    } catch {
      // Errors already surfaced by the mutation hooks — stay on the interview.
    }
  }

  function finishCapture() {
    setView("done")
  }

  function restart() {
    setActiveNode(null)
    setView("plan")
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MessagesSquare className="h-5 w-5 text-[#127A8A]" />
          Start a capture
        </h1>
        <p className="text-sm text-muted-foreground">
          Sit the role-holder down with Maven and turn what they know into validated training for
          whoever comes next.
        </p>
      </div>

      {view === "choose" && (
        <ChooseRoleStep
          onPick={(picked) => {
            setRoleTitle(picked)
            setView("plan")
          }}
        />
      )}

      {view === "plan" && !blueprint && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the role's knowledge areas…
        </div>
      )}

      {view === "plan" && blueprint && (
        <PlanStep
          blueprint={blueprint}
          expert={expert}
          setExpert={setExpert}
          capturedRefs={capturedRefs}
          starting={startSession.isPending}
          onCaptureArea={captureArea}
          onFinish={finishCapture}
          finishing={false}
        />
      )}

      {view === "interview" && roleTitle && sessionId && activeNode && (
        <InterviewStep
          roleTitle={roleTitle}
          node={activeNode}
          sessionId={sessionId}
          onFinishArea={finishArea}
          onCancel={restart}
          isFinishing={isFinishingArea}
        />
      )}

      {view === "done" && roleTitle && (
        <DoneStep
          roleTitle={roleTitle}
          units={allUnits}
          areasCaptured={capturedRefs.size}
          onRestart={restart}
        />
      )}
    </div>
  )
}
