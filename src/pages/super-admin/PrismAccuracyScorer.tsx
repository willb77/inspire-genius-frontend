import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Target, XCircle } from "lucide-react"
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
  usePrismSubject,
  usePrismSubjects,
  useScoreResponse,
  useScoreSession,
} from "@/hooks/super-admin/usePrismAccuracy"
import { useConversation, useConversations } from "@/hooks/super-admin/explainability/useExplainability"
import type {
  AccuracyReport,
  ClaimVerdict,
  ScoreResult,
  SessionScoreResult,
  SubjectSummary,
  Verdict,
} from "@/types/prism-accuracy"

/**
 * PRISM Accuracy Scorer — how faithfully an IG response describes a real
 * person's PRISM data.
 *
 * The page is a thin front on `/v1/agents/prism-accuracy`. Claims are found
 * in the response and each is checked arithmetically against the scores on
 * file; the model, when used, only extracts claims and grades interpretation
 * and never sees the stored values. Read the claim table before the number.
 */
export default function PrismAccuracyScorer() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Target className="h-6 w-6" /> PRISM Accuracy Scorer
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Scores an IG response against the person's PRISM scores on file. Every claim the
            response makes about a scale or colour is verified against the stored value; the
            composite is a summary of those verdicts, not an opinion.
          </p>
        </div>

        <Tabs defaultValue="response">
          <TabsList>
            <TabsTrigger value="response">Score a response</TabsTrigger>
            <TabsTrigger value="session">Score a session</TabsTrigger>
            <TabsTrigger value="rubric">Rubric &amp; how to use</TabsTrigger>
          </TabsList>
          <TabsContent value="response" className="mt-4">
            <ScoreResponsePanel />
          </TabsContent>
          <TabsContent value="session" className="mt-4">
            <ScoreSessionPanel />
          </TabsContent>
          <TabsContent value="rubric" className="mt-4">
            <RubricPanel />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}

// ─── Subject picker ──────────────────────────────────────────────────

function SubjectPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const subjects = usePrismSubjects(100)
  const subject = usePrismSubject(value.trim() || undefined)
  return (
    <div className="space-y-2">
      <Label htmlFor="subject-user-id">Subject user id</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="subject-user-id"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="The user whose PRISM data the response is about"
          className="font-mono text-sm"
        />
        <select
          aria-label="Users with a PRISM assessment"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value=""
          onChange={(e) => e.target.value && onChange(e.target.value)}
        >
          <option value="">
            {subjects.isLoading ? "Loading users…" : `Pick from ${subjects.data?.length ?? 0} with PRISM data`}
          </option>
          {(subjects.data ?? []).map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.user_id} · {s.scores} scores
            </option>
          ))}
        </select>
      </div>
      {value.trim() && subject.isLoading && (
        <p className="text-muted-foreground text-xs">Reading the profile…</p>
      )}
      {value.trim() && subject.isError && (
        <p className="text-xs text-red-600">No PRISM assessment on file for this user.</p>
      )}
      {subject.data && <SubjectCard subject={subject.data} />}
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
      {subject.conflicted && (
        <p className="mb-2 flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
          <ShieldAlert className="h-4 w-4" /> Conflicted profile — two assessments disagree on{" "}
          {subject.conflicts?.length ?? 0} scale(s). Nothing will be scored.
        </p>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span>
          <span className="text-muted-foreground">Scales on file</span>{" "}
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
          Defining scales:{" "}
          {subject.salient.map((s) => `${s.label} ${s.value} (${s.band})`).join(" · ")}
        </p>
      )}
    </div>
  )
}

// ─── Score one response ──────────────────────────────────────────────

function ScoreResponsePanel() {
  const [subjectId, setSubjectId] = useState("")
  const [mode, setMode] = useState<"paste" | "turn">("paste")
  const [responseText, setResponseText] = useState("")
  const [promptText, setPromptText] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [turnId, setTurnId] = useState("")
  const [useLlm, setUseLlm] = useState(true)
  const score = useScoreResponse()

  const conversations = useConversations({ user_id: subjectId.trim() || undefined, limit: 25 })
  const conversation = useConversation(mode === "turn" && sessionId ? sessionId : undefined)
  const assistantTurns = useMemo(
    () => (conversation.data?.turns ?? []).filter((t) => t.role === "assistant"),
    [conversation.data],
  )

  const canScore =
    !score.isPending &&
    (mode === "paste" ? !!subjectId.trim() && !!responseText.trim() : !!turnId)

  function run() {
    const body =
      mode === "paste"
        ? {
            subject_user_id: subjectId.trim(),
            response_text: responseText,
            prompt_text: promptText.trim() || undefined,
            use_llm: useLlm,
          }
        : { turn_id: turnId, subject_user_id: subjectId.trim() || undefined, use_llm: useLlm }
    score.mutate(body, {
      onError: (err) => toast.error(apiErrorMessage(err, "Could not score the response")),
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What to score</CardTitle>
          <CardDescription>
            Paste a response, or pick a stored assistant turn from the person's chat history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SubjectPicker value={subjectId} onChange={setSubjectId} />

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "paste" ? "default" : "outline"}
              onClick={() => setMode("paste")}
            >
              Paste a response
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "turn" ? "default" : "outline"}
              onClick={() => setMode("turn")}
            >
              Stored turn
            </Button>
          </div>

          {mode === "paste" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="response-text">IG response</Label>
                <Textarea
                  id="response-text"
                  rows={8}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="The response IG gave about this person…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt-text">User message (optional, gives the judge context)</Label>
                <Textarea
                  id="prompt-text"
                  rows={2}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="session-select">Conversation</Label>
                <select
                  id="session-select"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value)
                    setTurnId("")
                  }}
                >
                  <option value="">
                    {conversations.isLoading
                      ? "Loading…"
                      : `${conversations.data?.data.length ?? 0} conversations${subjectId.trim() ? " for this user" : ""}`}
                  </option>
                  {(conversations.data?.data ?? []).map((c) => (
                    <option key={c.session_id} value={c.session_id}>
                      {c.last_seen_at.slice(0, 16)} · {c.user_email ?? c.user_id} ·{" "}
                      {c.agents_involved.map((a) => a.name).join(", ") || "—"} · {c.message_count} msgs
                    </option>
                  ))}
                </select>
              </div>
              {sessionId && (
                <div className="space-y-2">
                  <Label>Assistant turn</Label>
                  {conversation.isLoading && (
                    <p className="text-muted-foreground text-xs">Loading turns…</p>
                  )}
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {assistantTurns.map((t) => (
                      <button
                        key={t.turn_id}
                        type="button"
                        onClick={() => setTurnId(t.turn_id)}
                        className={cn(
                          "w-full rounded-md border p-2 text-left text-xs",
                          turnId === t.turn_id ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                        )}
                      >
                        <span className="text-muted-foreground">
                          {t.agent_name ?? "IG"} · {t.created_at.slice(0, 16)}
                        </span>
                        <p className="mt-1 line-clamp-2">{t.content}</p>
                      </button>
                    ))}
                    {sessionId && !conversation.isLoading && assistantTurns.length === 0 && (
                      <p className="text-muted-foreground text-xs">No assistant turns in this session.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="use-llm">Refine with the model</Label>
              <p className="text-muted-foreground text-xs">
                Model extraction plus interpretive fidelity. Off = lexical extraction only.
              </p>
            </div>
            <Switch id="use-llm" checked={useLlm} onCheckedChange={setUseLlm} />
          </div>

          <Button onClick={run} disabled={!canScore}>
            {score.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
            Score
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {score.data ? (
          <ResultView result={score.data} />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground p-6 text-sm">
              The report appears here: composite score, the standard metrics, and a row per claim
              showing what was said, what is on file, and the verdict.
            </CardContent>
          </Card>
        )}
      </div>
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
                <tr key={`${v.claim.target}-${i}`} className="border-t align-top">
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

// ─── Score a session ─────────────────────────────────────────────────

function ScoreSessionPanel() {
  const [sessionId, setSessionId] = useState("")
  const [useLlm, setUseLlm] = useState(false)
  const conversations = useConversations({ limit: 25 })
  const score = useScoreSession()

  function run() {
    score.mutate(
      { session_id: sessionId.trim(), use_llm: useLlm, limit: 25 },
      { onError: (err) => toast.error(apiErrorMessage(err, "Could not score the session")) },
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Every assistant turn in one session</CardTitle>
          <CardDescription>
            The standard aggregate: mean and median score, pass rate at 80, grade distribution,
            and how many turns were ungrounded. Lexical extraction by default so it fits the
            gateway's time limit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Session id"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Session id"
              className="font-mono text-sm"
            />
            <select
              aria-label="Recent conversations"
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
              value=""
              onChange={(e) => e.target.value && setSessionId(e.target.value)}
            >
              <option value="">Recent conversations</option>
              {(conversations.data?.data ?? []).map((c) => (
                <option key={c.session_id} value={c.session_id}>
                  {c.last_seen_at.slice(0, 16)} · {c.user_email ?? c.user_id} · {c.message_count} msgs
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="session-llm" checked={useLlm} onCheckedChange={setUseLlm} />
            <Label htmlFor="session-llm">Refine with the model (slower)</Label>
          </div>
          <Button onClick={run} disabled={!sessionId.trim() || score.isPending}>
            {score.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Score session
          </Button>
        </CardContent>
      </Card>
      {score.data && <SessionResultView result={score.data} />}
    </div>
  )
}

function SessionResultView({ result }: { result: SessionScoreResult }) {
  const a = result.aggregate
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
          <CardTitle className="text-sm">Aggregate</CardTitle>
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
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1 pr-2">Agent</th>
                <th className="py-1 pr-2">PAS</th>
                <th className="py-1 pr-2">Claims</th>
                <th className="py-1 pr-2">Flags</th>
                <th className="py-1">Preview</th>
              </tr>
            </thead>
            <tbody>
              {result.turns.map((t) => (
                <tr key={t.turn_id} className="border-t align-top">
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
                  <td className="py-1.5 pr-2">
                    {t.n_inverted > 0 && <Badge variant="destructive">{t.n_inverted} inverted</Badge>}{" "}
                    {t.n_unsupported > 0 && <Badge variant="destructive">{t.n_unsupported} fabricated</Badge>}{" "}
                    {t.canon_violations.length > 0 && <Badge variant="destructive">canon</Badge>}
                    {!t.scorable && <span className="text-muted-foreground">{t.reason}</span>}
                  </td>
                  <td className="text-muted-foreground py-1.5">{t.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {r.bands.map((b) => (
                <li key={b.label}>
                  <span className="font-medium">
                    {b.label} ({b.low}–{b.high})
                  </span>{" "}
                  <span className="text-muted-foreground">{b.meaning}</span>
                </li>
              ))}
            </ul>
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
