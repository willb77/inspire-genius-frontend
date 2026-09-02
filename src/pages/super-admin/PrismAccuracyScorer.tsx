import { useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Search,
  ShieldAlert,
  Target,
  UserRound,
  XCircle,
} from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import {
  usePrismAccuracyRubric,
  usePrismConversations,
  usePrismSubject,
  usePrismSubjects,
  useScoreResponse,
  useScoreSession,
} from "@/hooks/super-admin/usePrismAccuracy"
import type {
  AccuracyReport,
  ClaimVerdict,
  ConversationRow,
  ScoreResult,
  SessionScoreResult,
  SessionLlmSummary,
  SessionTurnRow,
  SubjectRow,
  SubjectSummary,
  Verdict,
} from "@/types/prism-accuracy"

/**
 * PRISM Accuracy Scorer — how faithfully an IG response describes a real
 * person's PRISM data.
 *
 * People-first: you find a person by name or email, pick one of their
 * conversations by what it was about, and score it. Ids never lead; they
 * appear only as small print. The report shows every claim IG made and
 * whether the person's stored scores back it up. Read the claims before the
 * number.
 */
export default function PrismAccuracyScorer() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Target className="h-6 w-6" /> PRISM Accuracy Scorer
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Checks what IG told someone about their PRISM profile against the scores actually on
            file for that person. Find the person, pick a conversation, and read the verdict on
            each claim.
          </p>
        </div>

        <Tabs defaultValue="conversation">
          <TabsList>
            <TabsTrigger value="conversation">Score a conversation</TabsTrigger>
            <TabsTrigger value="paste">Score pasted text</TabsTrigger>
            <TabsTrigger value="rubric">Rubric &amp; how to use</TabsTrigger>
          </TabsList>
          <TabsContent value="conversation" className="mt-4">
            <ScoreConversationPanel />
          </TabsContent>
          <TabsContent value="paste" className="mt-4">
            <ScorePastedPanel />
          </TabsContent>
          <TabsContent value="rubric" className="mt-4">
            <RubricPanel />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}

// ─── Shared: step heading, person finder, profile card ───────────────

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold">
      <span className="bg-primary text-primary-foreground mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs">
        {n}
      </span>
      {children}
    </p>
  )
}

function personLabel(p: { name?: string | null; email?: string | null; user_id: string }): string {
  return p.name || p.email || `user ${p.user_id.slice(0, 8)}…`
}

function when(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso.slice(0, 16) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/**
 * Find a person by name or email among those who have PRISM data on file.
 * The list is the search result; the selection is shown as a card with what
 * the scorer will verify against.
 */
function PersonFinder({
  value,
  onChange,
}: {
  value: SubjectRow | null
  onChange: (p: SubjectRow | null) => void
}) {
  const [search, setSearch] = useState("")
  const people = usePrismSubjects(100, search)
  const profile = usePrismSubject(value?.user_id)

  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-sm">
            <UserRound className="h-3.5 w-3.5" /> {personLabel(value)}
            {value.email && value.name && <span className="text-muted-foreground font-normal">· {value.email}</span>}
          </Badge>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Change person
          </Button>
        </div>
        {profile.isLoading && <p className="text-muted-foreground text-xs">Reading their profile…</p>}
        {profile.isError && (
          <p className="text-xs text-red-600">Could not read this person's PRISM profile.</p>
        )}
        {profile.data && <SubjectCard subject={profile.data} />}
      </div>
    )
  }

  const list = people.data ?? []
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          aria-label="Find a person by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a name or email…"
          className="pl-8"
          autoComplete="off"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {people.isLoading
          ? "Loading people with PRISM data…"
          : `${list.length} ${list.length === 1 ? "person has" : "people have"} PRISM scores on file${search.trim() ? " matching your search" : ""}. Only people with a PRISM assessment can be scored.`}
      </p>
      <div className="max-h-72 divide-y overflow-y-auto rounded-md border" data-testid="person-list">
        {list.map((p) => (
          <button
            key={p.user_id}
            type="button"
            onClick={() => onChange(p)}
            className="hover:bg-muted/60 flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
          >
            <span>
              <span className="font-medium">{personLabel(p)}</span>
              {p.email && p.name && <span className="text-muted-foreground"> · {p.email}</span>}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">{p.scores} scores on file</span>
          </button>
        ))}
        {!people.isLoading && list.length === 0 && (
          <p className="text-muted-foreground px-3 py-4 text-sm">
            No one matches. Names come from the user's profile; try their email instead.
          </p>
        )}
      </div>
    </div>
  )
}

function SubjectCard({ subject }: { subject: SubjectSummary }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        subject.conflicted ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40" : "bg-muted/40",
      )}
      data-testid="subject-card"
    >
      <p className="mb-1 font-medium">
        {personLabel(subject)}
        {subject.email && subject.name && <span className="text-muted-foreground font-normal"> · {subject.email}</span>}
      </p>
      {subject.conflicted && (
        <p className="mb-2 flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
          <ShieldAlert className="h-4 w-4" /> Conflicted profile — two assessments disagree on{" "}
          {subject.conflicts?.length ?? 0} scale(s). Nothing will be scored.
        </p>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span>
          <span className="text-muted-foreground">PRISM scales on file</span>{" "}
          <strong>{subject.scales_on_file ?? subject.coverage}</strong> / 88
        </span>
        {subject.colours && (
          <span className="flex flex-wrap gap-2">
            {Object.entries(subject.colours).map(([k, v]) => (
              <Badge key={k} variant="outline">
                {k} {v}
              </Badge>
            ))}
          </span>
        )}
        {!subject.colours && !subject.conflicted && (
          <span className="text-muted-foreground">No colour means (behaviours incomplete)</span>
        )}
      </div>
      {subject.salient.length > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          What defines them:{" "}
          {subject.salient.map((s) => `${s.label} ${s.value} (${s.band})`).join(" · ")}
        </p>
      )}
      <p className="text-muted-foreground mt-1 text-[10px]">id {subject.user_id}</p>
    </div>
  )
}

// ─── Score a conversation ────────────────────────────────────────────

function ConversationCard({
  c,
  selected,
  onSelect,
}: {
  c: ConversationRow
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select conversation ${c.session_id}`}
      className={cn(
        "w-full rounded-md border p-3 text-left text-sm transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-medium">{personLabel(c)}</span>
        <span className="text-muted-foreground text-xs">{when(c.last_seen_at)}</span>
      </div>
      <p className="mt-1 line-clamp-2 italic">
        {c.opening_message ? `“${c.opening_message}”` : "(no opening message stored)"}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        {c.agents.length ? c.agents.join(", ") : "IG"} · {c.ig_turns} {c.ig_turns === 1 ? "reply" : "replies"} from IG
      </p>
    </button>
  )
}

function ScoreConversationPanel() {
  const [person, setPerson] = useState<SubjectRow | null>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ConversationRow | null>(null)
  const [useLlm, setUseLlm] = useState(false)
  const conversations = usePrismConversations({ user_id: person?.user_id, search, limit: 30 })
  const score = useScoreSession()

  const waitingFor = score.isPending
    ? useLlm
      ? "Scoring every IG reply and asking the model to grade interpretation — up to about 25 seconds…"
      : "Scoring every IG reply in the conversation…"
    : !selected
      ? "Pick a conversation above."
      : ""

  function run() {
    if (!selected) return
    score.mutate(
      { session_id: selected.session_id, use_llm: useLlm, limit: 25 },
      { onError: (err) => toast.error(apiErrorMessage(err, "Could not score the conversation")) },
    )
  }

  const list = conversations.data ?? []
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score a conversation</CardTitle>
          <CardDescription>
            Every reply IG gave in the conversation is checked against the person's PRISM scores.
            You get one score per reply, a summary, and a claim-by-claim table for any reply you
            click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <StepHeading n={1}>Who is it about? (optional — narrows the list)</StepHeading>
            <PersonFinder value={person} onChange={(p) => { setPerson(p); setSelected(null) }} />
          </div>

          <div className="space-y-2">
            <StepHeading n={2}>Pick the conversation</StepHeading>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
              <Input
                aria-label="Search conversations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or words from the opening message…"
                className="pl-8"
                autoComplete="off"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {conversations.isLoading
                ? "Loading conversations…"
                : `${list.length} conversation${list.length === 1 ? "" : "s"}${person ? ` with ${personLabel(person)}` : " with people who have PRISM data"}, newest first.`}
            </p>
            <div className="grid gap-2 md:grid-cols-2" data-testid="conversation-list">
              {list.map((c) => (
                <ConversationCard
                  key={c.session_id}
                  c={c}
                  selected={selected?.session_id === c.session_id}
                  onSelect={() => setSelected(c)}
                />
              ))}
            </div>
            {!conversations.isLoading && list.length === 0 && (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" /> No conversations found. Only people with a
                PRISM assessment are listed.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <StepHeading n={3}>Score it</StepHeading>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={run} disabled={!selected || score.isPending}>
                {score.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                Score this conversation
              </Button>
              <div className="flex items-center gap-2">
                <Switch id="session-llm" checked={useLlm} onCheckedChange={setUseLlm} />
                <Label htmlFor="session-llm" className="text-xs">
                  Also grade interpretation with the model (about 25 seconds; very long conversations are graded
                  partially and the result says how many turns the model reached)
                </Label>
              </div>
            </div>
            {waitingFor && (
              <p className="text-muted-foreground text-xs" data-testid="waiting-for">
                {waitingFor}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {score.data && <SessionResultView result={score.data} />}
    </div>
  )
}

// ─── Score pasted text ───────────────────────────────────────────────

function ScorePastedPanel() {
  const [person, setPerson] = useState<SubjectRow | null>(null)
  const [responseText, setResponseText] = useState("")
  const [promptText, setPromptText] = useState("")
  const [useLlm, setUseLlm] = useState(true)
  const score = useScoreResponse()

  const canScore = !score.isPending && !!person && !!responseText.trim()
  const waitingFor = score.isPending
    ? "Scoring…"
    : !person
      ? "Choose the person first (step 1)."
      : !responseText.trim()
        ? "Paste what IG said (step 2)."
        : ""

  function run() {
    if (!person) return
    score.mutate(
      {
        subject_user_id: person.user_id,
        response_text: responseText,
        prompt_text: promptText.trim() || undefined,
        use_llm: useLlm,
      },
      { onError: (err) => toast.error(apiErrorMessage(err, "Could not score the response")) },
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score pasted text</CardTitle>
          <CardDescription>
            For text that is not in chat history: a profile write-up, a coaching summary, a draft
            reply. Choose the person it is about, paste it, score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <StepHeading n={1}>Who is it about?</StepHeading>
            <PersonFinder value={person} onChange={setPerson} />
          </div>

          <div className="space-y-3">
            <StepHeading n={2}>What did IG say?</StepHeading>
            <div className="space-y-2">
              <Label htmlFor="response-text">IG's text</Label>
              <Textarea
                id="response-text"
                rows={8}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Paste what IG wrote about this person…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-text">What the person asked (optional, gives the judge context)</Label>
              <Textarea
                id="prompt-text"
                rows={2}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="use-llm" checked={useLlm} onCheckedChange={setUseLlm} />
              <Label htmlFor="use-llm" className="text-xs">
                Also grade interpretation with the model
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <StepHeading n={3}>Score it</StepHeading>
            <Button onClick={run} disabled={!canScore}>
              {score.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
              Score
            </Button>
            {waitingFor && (
              <p className="text-muted-foreground text-xs" data-testid="waiting-for">
                {waitingFor}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {score.data && (
        <div className="space-y-4">
          <ResultView result={score.data} />
        </div>
      )}
    </div>
  )
}


// ─── Result rendering ────────────────────────────────────────────────

const VERDICT_STYLE: Record<Verdict, string> = {
  correct: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  incorrect: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  unsupported: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  unverifiable: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
}

function gradeColour(grade: string | null) {
  if (grade === "A" || grade === "B") return "text-emerald-600"
  if (grade === "C") return "text-amber-600"
  return "text-red-600"
}

function pct(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`
}

/** One sentence a reader can act on, built from the caps and counts. */
function plainVerdict(report: AccuracyReport): string {
  const m = report.metrics
  const inverted = report.verdicts.filter((v) => v.inverted)
  const parts: string[] = []
  parts.push(
    `${m.n_correct} of ${m.n_verifiable} checkable claim${m.n_verifiable === 1 ? "" : "s"} matched the person's PRISM file` +
      (m.n_partial > 0 ? `, ${m.n_partial} ${m.n_partial === 1 ? "was" : "were"} one band off` : "") +
      ".",
  )
  if (inverted.length > 0) {
    const names = inverted.map((v) => v.label).join(", ")
    parts.push(
      `${inverted.length === 1 ? "One claim" : `${inverted.length} claims`} put the person on the wrong side of a scale (${names}), which caps the score at 69 no matter what else was right.`,
    )
  }
  if (m.n_unsupported > 0) {
    parts.push(
      `${m.n_unsupported} claim${m.n_unsupported === 1 ? "" : "s"} named a scale this person has no value for` +
        (report.caps_applied.includes("fabrication") ? ", which caps the score at 49." : "."),
    )
  }
  if (m.canon_violations.length > 0) {
    parts.push("It also breaks PRISM canon (see below), which caps the score at 59.")
  }
  if (parts.length === 1 && report.caps_applied.length === 0) {
    parts.push(
      report.grade === "A" || report.grade === "B"
        ? "Nothing was inverted, fabricated or against canon."
        : "Nothing was inverted, fabricated or against canon; the score is held down by partial matches or by missing the person's defining scales.",
    )
  }
  return parts.join(" ")
}

function ResultView({ result }: { result: ScoreResult }) {
  const { report, llm, turn } = result
  return (
    <>
      <ReportHeadline report={report} />
      {turn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Turn {turn.turn_id.slice(0, 8)}… · {turn.agent_name ?? "IG"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {turn.prompt_text && (
              <p className="text-muted-foreground">
                <span className="font-medium">User:</span> {turn.prompt_text}
              </p>
            )}
            <p className="whitespace-pre-wrap">{turn.response_text}</p>
          </CardContent>
        </Card>
      )}
      <MetricsGrid report={report} />
      <ClaimsTable verdicts={report.verdicts} />
      <p className="text-muted-foreground text-xs">
        Extraction: {report.extraction}.{" "}
        {llm.used
          ? `Model ${llm.model} extracted ${llm.claims} claims and graded interpretation on ${llm.anchored_scales?.length ?? 0} anchored scales.`
          : llm.reason ?? "Model not used."}
        {report.mentions.length > 0 && ` Mentioned without a level: ${report.mentions.join(", ")}.`}
      </p>
    </>
  )
}

function ReportHeadline({ report }: { report: AccuracyReport }) {
  if (!report.scorable) {
    return (
      <Card className="border-amber-300 dark:border-amber-700">
        <CardContent className="flex gap-3 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Not scorable</p>
            <p className="text-muted-foreground mt-1">{report.reason}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 p-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">PRISM Accuracy Score</p>
          <p className="text-4xl font-semibold" data-testid="pas">
            {report.pas}
            <span className={cn("ml-3 text-2xl", gradeColour(report.grade))}>{report.grade}</span>
          </p>
        </div>
        <p className="w-full text-sm" data-testid="plain-verdict">
          {plainVerdict(report)}
        </p>
        <div className="flex flex-wrap gap-2">
          {report.caps_applied.length === 0 ? (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> No caps applied
            </Badge>
          ) : (
            report.caps_applied.map((c) => (
              <Badge key={c} variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> cap: {c.replace("_", " ")}
              </Badge>
            ))
          )}
        </div>
        {report.metrics.canon_violations.length > 0 && (
          <ul className="w-full space-y-1 text-sm text-red-700 dark:text-red-300">
            {report.metrics.canon_violations.map((v) => (
              <li key={v} className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {v}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function MetricsGrid({ report }: { report: AccuracyReport }) {
  const m = report.metrics
  const rows: { label: string; value: string; hint: string }[] = [
    { label: "Claim precision", value: pct(m.claim_precision), hint: `${m.n_correct} correct · ${m.n_partial} partial · ${m.n_incorrect} incorrect of ${m.n_verifiable}` },
    { label: "Direction accuracy", value: pct(m.direction_accuracy), hint: "1 − share of claims on the wrong side of the scale" },
    { label: "Fabrication rate", value: pct(m.fabrication_rate), hint: `${m.n_unsupported} claim(s) about scales with no value on file` },
    { label: "Numeric MAE", value: m.numeric_mae === null ? "—" : String(m.numeric_mae), hint: "mean |stated − on file| where a number was stated" },
    { label: "Salience recall", value: pct(m.salience_recall), hint: `engaged ${m.salient_engaged.length} of ${m.salient_scales.length}: ${m.salient_labels.join(", ")}` },
    { label: "Interpretive fidelity", value: pct(m.interpretive_fidelity), hint: m.interpretive_fidelity === null ? "not scored (model not used) — weight redistributed" : "judge score against the rubric anchors" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Standard metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-muted-foreground text-xs">{r.label}</dt>
              <dd className="font-semibold">{r.value}</dd>
              <dd className="text-muted-foreground text-[11px]">{r.hint}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function ClaimsTable({ verdicts }: { verdicts: ClaimVerdict[] }) {
  if (verdicts.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Claims ({verdicts.length})</CardTitle>
        <CardDescription>What the response said, what is on file, and the verdict.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="py-1 pr-2">Scale</th>
              <th className="py-1 pr-2">Claimed</th>
              <th className="py-1 pr-2">On file</th>
              <th className="py-1 pr-2">Verdict</th>
              <th className="py-1">Quote / note</th>
            </tr>
          </thead>
          <tbody>
            {verdicts.map((v, i) => {
              const claimed =
                v.claim.kind === "colour_rank"
                  ? v.claim.rank === "max" ? "dominant" : "weakest"
                  : [v.claim.claimed_band, v.claim.claimed_value !== null ? `(${v.claim.claimed_value})` : null]
                      .filter(Boolean)
                      .join(" ") || "—"
              return (
                <tr
                  key={`${v.claim.target}-${i}`}
                  className={cn("border-t align-top", v.inverted && "bg-red-50 dark:bg-red-950/30")}
                >
                  <td className="py-1.5 pr-2">
                    <div className="font-medium">{v.label}</div>
                    <div className="text-muted-foreground">{v.group}</div>
                  </td>
                  <td className="py-1.5 pr-2">{claimed}</td>
                  <td className="py-1.5 pr-2">
                    {v.actual_value === null ? "—" : `${v.actual_value} · ${v.actual_band}`}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span className={cn("rounded px-1.5 py-0.5 font-medium", VERDICT_STYLE[v.verdict])}>
                      {v.verdict}
                    </span>
                    {v.inverted && <div className="mt-1 font-medium text-red-700">inverted</div>}
                  </td>
                  <td className="py-1.5">
                    <div className="italic">“{v.claim.quote}”</div>
                    {v.note && <div className="text-muted-foreground">{v.note}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

// ─── Session results ─────────────────────────────────────────────────

/** One sentence on how far the model pass got, or null when the model was not asked for. */
function modelCoverageInWords(llm: SessionLlmSummary | undefined): string | null {
  if (!llm || !llm.requested) return null
  if (!llm.used) {
    return llm.reason
      ? `The model did not grade interpretation: ${llm.reason}.`
      : llm.turns_not_finished > 0
        ? `The model did not finish any turn within the ${Math.round(llm.budget_seconds)}-second budget the gateway allows, so every turn was scored by the lexical extractor alone.`
        : "The model was not available, so every turn was scored by the lexical extractor alone."
  }
  const total = llm.turns_graded + llm.turns_not_finished + llm.turns_failed
  const bits = [`The model${llm.model ? ` (${llm.model})` : ""} graded interpretation on ${llm.turns_graded} of ${total} turn${total === 1 ? "" : "s"}`]
  if (llm.turns_not_finished > 0) {
    bits.push(
      `${llm.turns_not_finished} did not finish within the ${Math.round(llm.budget_seconds)}-second budget the gateway allows and ${llm.turns_not_finished === 1 ? "was" : "were"} scored lexically`,
    )
  }
  if (llm.turns_failed > 0) {
    bits.push(`${llm.turns_failed} came back unusable and ${llm.turns_failed === 1 ? "was" : "were"} scored lexically`)
  }
  return bits.join("; ") + (llm.elapsed_seconds !== null ? ` (${llm.elapsed_seconds}s).` : ".")
}

function turnFlagsInWords(t: SessionTurnRow): string {
  if (!t.scorable) return t.reason
  const bits: string[] = []
  if (t.n_inverted > 0) {
    bits.push(`${t.n_inverted} claim${t.n_inverted === 1 ? "" : "s"} put the person on the wrong side of a scale (caps at 69)`)
  }
  if (t.n_unsupported > 0) {
    bits.push(`${t.n_unsupported} claim${t.n_unsupported === 1 ? "" : "s"} about a scale with no value on file`)
  }
  if (t.canon_violations.length > 0) {
    bits.push(`${t.canon_violations.length} PRISM canon error${t.canon_violations.length === 1 ? "" : "s"} (caps at 59)`)
  }
  const flags = bits.length ? bits.join("; ") + "." : "No inversions, fabrications or canon errors."
  return t.llm_used === false && t.llm_note ? `${flags} Model: ${t.llm_note}.` : flags
}

function SessionResultView({ result }: { result: SessionScoreResult }) {
  const a = result.aggregate
  const detail = useScoreResponse()
  const [openTurn, setOpenTurn] = useState<string | null>(null)

  function openDetail(turnId: string) {
    setOpenTurn(turnId)
    detail.mutate(
      { turn_id: turnId, use_llm: false },
      { onError: (err) => toast.error(apiErrorMessage(err, "Could not load that turn's claims")) },
    )
  }

  const scoredTurns = result.turns.filter((t) => t.scorable)
  const summary = (() => {
    const n = scoredTurns.length
    if (n === 0) return "No turn in this conversation made a checkable PRISM claim, so there is nothing to score."
    const s: string[] = []
    s.push(
      `${n} of ${a.n_turns} IG turn${a.n_turns === 1 ? "" : "s"} made PRISM claims and ${n === 1 ? "was" : "were"} scored; ` +
        `${a.n_ungrounded} ${a.n_ungrounded === 1 ? "was" : "were"} small talk or logistics and ${a.n_ungrounded === 1 ? "is" : "are"} not counted.`,
    )
    s.push(`Mean score ${a.mean_pas}, and ${pct(a.pass_rate)} of scored turns reached 80 (a B).`)
    const defects: string[] = []
    if (a.total_inverted > 0) defects.push(`${a.total_inverted} inverted claim${a.total_inverted === 1 ? "" : "s"}`)
    if (a.total_unsupported > 0) defects.push(`${a.total_unsupported} fabricated`)
    if (a.total_canon_violations > 0) defects.push(`${a.total_canon_violations} canon error${a.total_canon_violations === 1 ? "" : "s"}`)
    s.push(
      defects.length
        ? `Defects to fix in the prompt or agent: ${defects.join(", ")}. Click a turn below to see exactly which claim.`
        : "No inversions, fabrications or canon errors. Click a turn below to see its claims.",
    )
    return s.join(" ")
  })()
  const modelCoverage = modelCoverageInWords(result.llm)

  const tiles: [string, string][] = [
    ["Mean PAS", a.mean_pas === null ? "—" : String(a.mean_pas)],
    ["Median PAS", a.median_pas === null ? "—" : String(a.median_pas)],
    ["Pass rate (≥ 80)", pct(a.pass_rate)],
    ["Scored / turns", `${a.n_scored} / ${a.n_turns}`],
    ["Ungrounded turns", String(a.n_ungrounded)],
    ["Inverted claims", String(a.total_inverted)],
    ["Fabricated claims", String(a.total_unsupported)],
    ["Canon violations", String(a.total_canon_violations)],
  ]
  return (
    <>
      {result.subject && <SubjectCard subject={result.subject} />}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            What this conversation scored{result.subject ? ` — ${personLabel(result.subject)}` : ""}
          </CardTitle>
          <CardDescription data-testid="session-summary">{summary}</CardDescription>
          {modelCoverage && (
            <CardDescription data-testid="model-coverage">{modelCoverage}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {tiles.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground text-xs">{k}</dt>
                <dd className="font-semibold" data-testid={`agg-${k}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">
            Grades: {Object.entries(a.grades).map(([g, n]) => `${g} ${n}`).join(" · ")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Turns</CardTitle>
          <CardDescription>Click a turn to open its claim-by-claim table.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1 pr-2">Agent</th>
                <th className="py-1 pr-2">Score</th>
                <th className="py-1 pr-2">Claims</th>
                <th className="py-1 pr-2">What happened</th>
                <th className="py-1">Preview</th>
              </tr>
            </thead>
            <tbody>
              {result.turns.map((t) => (
                <tr
                  key={t.turn_id}
                  className={cn(
                    "cursor-pointer border-t align-top hover:bg-muted/50",
                    openTurn === t.turn_id && "bg-primary/5",
                  )}
                  onClick={() => openDetail(t.turn_id)}
                  role="button"
                  aria-label={`Open claims for turn ${t.turn_id}`}
                >
                  <td className="py-1.5 pr-2">{t.agent_name ?? "IG"}</td>
                  <td className="py-1.5 pr-2 font-medium">
                    {t.scorable ? (
                      <span className={gradeColour(t.grade)}>
                        {t.pas} {t.grade}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">n/a</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">{t.n_claims}</td>
                  <td className={cn("py-1.5 pr-2", (t.n_inverted > 0 || t.n_unsupported > 0 || t.canon_violations.length > 0) && "text-red-700 dark:text-red-300")}>
                    {turnFlagsInWords(t)}
                  </td>
                  <td className="text-muted-foreground py-1.5">{t.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {openTurn && detail.isPending && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading that turn's claims…
        </p>
      )}
      {openTurn && detail.data && detail.data.turn?.turn_id === openTurn && (
        <div className="space-y-4" data-testid="session-turn-detail">
          <ResultView result={detail.data} />
        </div>
      )}
    </>
  )
}

// ─── Rubric ──────────────────────────────────────────────────────────

function RubricPanel() {
  const rubric = usePrismAccuracyRubric()
  if (rubric.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading the rubric…</p>
  }
  if (!rubric.data) {
    return <p className="text-sm text-red-600">Could not load the rubric from the agent-engine.</p>
  }
  const r = rubric.data
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {r.name} <span className="text-muted-foreground text-xs">v{r.version}</span>
          </CardTitle>
          <CardDescription>{r.purpose}</CardDescription>
          {r.source && (
            <p className="text-muted-foreground text-xs" data-testid="rubric-source">
              Source of truth for the eight behaviours and four colours: <em>{r.source.document}</em>{" "}
              (verbatim extraction, content sha {r.source.content_sha256.slice(0, 12)}). Not covered by it:{" "}
              {r.source.not_covered}
            </p>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="py-1 pr-3">Criterion</th>
                <th className="py-1 pr-3">Weight</th>
                <th className="py-1 pr-3">Measures</th>
                <th className="py-1 pr-3">Scoring</th>
                <th className="py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {r.criteria.map((c) => (
                <tr key={c.key} className="border-t align-top">
                  <td className="py-2 pr-3 font-medium">{c.name}</td>
                  <td className="py-2 pr-3">{Math.round(c.weight * 100)}%</td>
                  <td className="py-2 pr-3">{c.measures}</td>
                  <td className="text-muted-foreground py-2 pr-3">{c.scoring}</td>
                  <td className="py-2">{c.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hard caps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {r.caps.map((c) => (
                <li key={c.key}>{c.rule}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3 text-xs">
              Grades: {r.grades.map((g) => `${g.grade} ≥ ${g.min}`).join(" · ")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bands (0–100)</CardTitle>
            <CardDescription>
              Two scales, by design: the PRISM guide's intensity scale for the eight behaviours and
              the four colours, and IG's six-band rubric for the other 80 scales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["guide", "rubric"] as const).map((scheme) => (
              <div key={scheme}>
                <p className="text-xs font-medium">
                  {scheme === "guide" ? "PRISM guide — behaviours and colours" : "IG rubric — other scales"}
                </p>
                {r.band_schemes?.[scheme] && (
                  <p className="text-muted-foreground mb-1 text-xs">{r.band_schemes[scheme]}</p>
                )}
                <ul className="space-y-1 text-sm">
                  {r.bands
                    .filter((b) => (b.scheme ?? "rubric") === scheme)
                    .map((b) => (
                      <li key={`${scheme}-${b.label}`}>
                        <span className="font-medium">
                          {b.label} ({b.low}–{b.high})
                        </span>{" "}
                        <span className="text-muted-foreground">{b.meaning}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {r.opposites && r.opposites.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Dimension opposites (opposite in behaviour, never in map position):{" "}
                {r.opposites.map((o) => `${o.a} ↔ ${o.b}`).join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to use it</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {r.usage.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metric definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              {Object.entries(r.metrics).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-xs">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">When nothing is scored</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {r.not_scorable.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
