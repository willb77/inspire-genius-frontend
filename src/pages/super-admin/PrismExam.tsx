import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  GitCompareArrows,
  Loader2,
  MinusCircle,
  Play,
  Share2,
  StopCircle,
  Upload,
  XCircle,
} from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { downloadBlob } from "@/lib/exportTranscript"
import { answersToCsv, answersToMarkdown, pct, pointsOf, runTitle, scoreOf, shortSha, when } from "@/lib/prism-exam/export"
import { validateQuestionSet } from "@/lib/prism-exam/validateQuestionSet"
import {
  isRunActive,
  useActivateQuestionSet,
  useActiveQuestionSet,
  useCancelExamRun,
  useDeleteGrant,
  useExamAnswers,
  useExamDiff,
  useExamGrants,
  useExamQuestionSet,
  useExamQuestionSets,
  useExamRun,
  useExamRuns,
  useImportQuestionSet,
  usePutGrant,
  useReplaceQuestionSet,
  useShareQuestionSet,
  useStartExamRun,
} from "@/hooks/super-admin/usePrismExam"
import type {
  DiffRecord,
  ExamAccess,
  ExamAnswer,
  ExamRun,
  ExamRunDetail,
  ExamVerdict,
  ImportResult,
  QuestionSet,
  QuestionSetSummary,
} from "@/types/prism-exam"

type TabKey = "run" | "results" | "history" | "questions" | "access"

/**
 * PRISM Practitioner Exam — run an exam against the platform from the browser,
 * watch it score, and keep every run.
 *
 * The default set is the same 91-question handbook set the CLI harness uses;
 * other sets are saved by name (pasted as JSON or imported from an .xlsx) and
 * picked per run. Every question is asked of Meridian as the synthetic exam
 * user and judged against the set's expected answers. A run takes about ten
 * minutes and shares the engine's LLM capacity with live users, so it is one
 * run per tier at a time and the concurrency is capped.
 *
 * Super-admins get this page under `/super-admin/prism-exam`. A granted user
 * (manager or above, with a grant) gets {@link PrismExamContent} at
 * `/prism-exam` in their own layout: their own and shared sets, their own runs,
 * no active-set editing and no Access tab. The server enforces all of that;
 * the page only hides what would 403.
 */
export default function PrismExam() {
  return (
    <SuperAdminLayout>
      <PrismExamContent superAdmin />
    </SuperAdminLayout>
  )
}

export function PrismExamContent({ superAdmin, access }: { superAdmin: boolean; access?: ExamAccess }) {
  const [tab, setTab] = useState<TabKey>("run")
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined)

  const runs = useExamRuns(50)
  const latest = runs.data?.[0]
  useEffect(() => {
    if (!selectedRunId && latest) setSelectedRunId(latest.id)
  }, [latest, selectedRunId])

  const openResults = (id: string) => {
    setSelectedRunId(id)
    setTab("results")
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ClipboardCheck className="h-6 w-6" /> PRISM Practitioner Exam
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Sits a PRISM exam against this tier: every question is asked of Meridian as the exam user
            and marked against the set&apos;s expected answers. Start a run, watch it score, read the
            misses, and compare runs over time.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="run">Run</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            {superAdmin && <TabsTrigger value="access">Access</TabsTrigger>}
          </TabsList>
          <TabsContent value="run" className="mt-4">
            <RunPanel
              runs={runs.data ?? []}
              onStarted={openResults}
              onOpen={openResults}
              superAdmin={superAdmin}
              access={access}
            />
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <ResultsPanel runs={runs.data ?? []} runId={selectedRunId} onSelect={setSelectedRunId} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <HistoryPanel runs={runs.data ?? []} loading={runs.isLoading} onOpen={openResults} />
          </TabsContent>
          <TabsContent value="questions" className="mt-4">
            <QuestionsPanel superAdmin={superAdmin} />
          </TabsContent>
          {superAdmin && (
            <TabsContent value="access" className="mt-4">
              <AccessPanel />
            </TabsContent>
          )}
        </Tabs>
    </div>
  )
}

// ─── Shared bits ─────────────────────────────────────────────────────

const VERDICT_STYLE: Record<ExamVerdict, string> = {
  correct: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  wrong: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
}

function VerdictBadge({ verdict }: { verdict: ExamVerdict | null | undefined }) {
  if (!verdict) {
    return (
      <Badge variant="outline" className="gap-1">
        <MinusCircle className="h-3 w-3" /> no verdict
      </Badge>
    )
  }
  const Icon = verdict === "correct" ? CheckCircle2 : verdict === "partial" ? AlertTriangle : XCircle
  return (
    <Badge className={cn("gap-1 border-0", VERDICT_STYLE[verdict])}>
      <Icon className="h-3 w-3" /> {verdict} · {scoreOf(verdict)} / 1
    </Badge>
  )
}

function StatusBadge({ run }: { run: Pick<ExamRun, "status"> }) {
  const s = run.status
  const cls =
    s === "complete"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
      : s === "error"
        ? "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
        : s === "cancelled"
          ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          : "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"
  return (
    <Badge className={cn("gap-1 border-0 capitalize", cls)}>
      {isRunActive(run) && <Loader2 className="h-3 w-3 animate-spin" />} {s}
    </Badge>
  )
}

function ScoreLine({ run }: { run: Pick<ExamRunDetail, "score" | "pass_mark" | "passed" | "status"> }) {
  if (run.score === null) return <span className="text-muted-foreground text-sm">not scored yet</span>
  return (
    <span className="flex items-center gap-2">
      <span className="text-3xl font-semibold tabular-nums">{pct(run.score)}</span>
      <Badge
        className={cn(
          "border-0",
          run.passed
            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
            : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
        )}
      >
        {run.passed ? "PASS" : "FAIL"} · pass mark {pct(run.pass_mark, 0)}
      </Badge>
    </span>
  )
}

// ─── Run ─────────────────────────────────────────────────────────────

/** The run picker's value for "whatever set is active" — a super-admin's default, as before. */
const ACTIVE_SET = ""

function setLabel(s: Pick<QuestionSetSummary, "name" | "version">): string {
  return `${s.name} (v${s.version})`
}

function RunPanel({
  runs,
  onStarted,
  onOpen,
  superAdmin,
  access,
}: {
  runs: ExamRun[]
  onStarted: (id: string) => void
  onOpen: (id: string) => void
  superAdmin: boolean
  access?: ExamAccess
}) {
  const [label, setRunLabel] = useState("")
  const [concurrency, setConcurrency] = useState(2)
  const [setId, setSetId] = useState<string>(ACTIVE_SET)
  const active = runs.find(isRunActive)
  const activeDetail = useExamRun(active?.id)
  const start = useStartExamRun()
  const cancel = useCancelExamRun()
  const qset = useActiveQuestionSet(superAdmin)
  const sets = useExamQuestionSets()
  const others = (sets.data ?? []).filter((x) => !(superAdmin && x.is_active))
  // A granted user has no "active set" to fall back on: they pick one of theirs or a shared one.
  const chosenId = superAdmin ? setId : setId || others[0]?.id || ""
  const chosen = (sets.data ?? []).find((x) => x.id === chosenId)
  const capReached = !superAdmin && !!access?.daily_cap && access.runs_last_24h >= access.daily_cap

  const onStart = () => {
    start.mutate(
      chosenId ? { label, concurrency, question_set_id: chosenId } : { label, concurrency },
      {
        onSuccess: (res) => {
          toast.success(`Exam started — ${res.total} questions`)
          setRunLabel("")
          onStarted(res.run_id)
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not start the exam")),
      },
    )
  }

  const onCancel = () => {
    if (!active) return
    cancel.mutate(active.id, {
      onSuccess: () => toast.success("Run cancelled"),
      onError: (e) => toast.error(apiErrorMessage(e, "Could not cancel the run")),
    })
  }

  const detail = activeDetail.data ?? active
  const done = detail?.done ?? 0
  const total = detail?.total ?? 0
  const progress = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a run</CardTitle>
          <CardDescription>
            {chosen
              ? `${chosen.count ?? "?"} questions · ${setLabel(chosen)} · pass mark ${pct(chosen.pass_mark, 0)}`
              : superAdmin
                ? qset.data
                  ? `${qset.data.count ?? qset.data.questions.length} questions · ${qset.data.name} (v${qset.data.version}) · pass mark ${pct(qset.data.pass_mark, 0)}`
                  : "Loading the active question set…"
                : sets.isLoading
                  ? "Loading your question sets…"
                  : "No question set yet — import one on the Questions tab."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exam-set">Question set</Label>
            <select
              id="exam-set"
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={chosenId}
              onChange={(e) => setSetId(e.target.value)}
            >
              {superAdmin && (
                <option value={ACTIVE_SET}>Active set{qset.data ? ` — ${setLabel(qset.data)}` : ""}</option>
              )}
              {!superAdmin && !others.length && <option value="">No sets available</option>}
              {others.map((x) => (
                <option key={x.id} value={x.id}>
                  {setLabel(x)} · {x.count ?? "?"} questions{x.shared ? " · shared" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-label">Label (optional)</Label>
            <Input
              id="exam-label"
              placeholder="e.g. after canon sections"
              value={label}
              maxLength={120}
              onChange={(e) => setRunLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Concurrency</Label>
            <div className="flex gap-2">
              {[1, 2].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={concurrency === n ? "default" : "outline"}
                  onClick={() => setConcurrency(n)}
                  aria-pressed={concurrency === n}
                >
                  {n} at a time
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              A run is about 90 questions through Meridian plus a judge call each — roughly ten minutes
              at two at a time. It shares the engine&apos;s LLM capacity with live users, so keep it at one
              when people are on the platform.
            </p>
          </div>
          {!superAdmin && access?.daily_cap ? (
            <p className="text-muted-foreground text-xs">
              {access.runs_last_24h} of {access.daily_cap} runs used in the last 24 hours.
            </p>
          ) : null}
          <Button
            type="button"
            onClick={onStart}
            disabled={!!active || start.isPending || capReached || (!superAdmin && !chosenId)}
          >
            {start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start exam
          </Button>
          {active && (
            <p className="text-muted-foreground text-xs">One run at a time per tier — wait for the current run to finish or cancel it.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current run</CardTitle>
          <CardDescription>{active ? runTitle(active) : "Nothing running on this tier."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {active ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <StatusBadge run={detail ?? active} />
                <span className="tabular-nums">
                  {done} / {total} answered
                </span>
              </div>
              <Progress value={progress} aria-label="run progress" />
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>started {when(active.started_at ?? active.created_at)}</span>
                <span>engine {shortSha(active.engine_sha)}</span>
                <span>concurrency {active.concurrency}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpen(active.id)}>
                  Watch results
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={onCancel} disabled={cancel.isPending}>
                  <StopCircle className="mr-1 h-4 w-4" /> Cancel run
                </Button>
              </div>
            </>
          ) : (
            <RecentRuns runs={runs.slice(0, 3)} onOpen={onOpen} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RecentRuns({ runs, onOpen }: { runs: ExamRun[]; onOpen: (id: string) => void }) {
  if (!runs.length) return <p className="text-muted-foreground text-sm">No runs on this tier yet.</p>
  return (
    <ul className="divide-y text-sm">
      {runs.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 py-2">
          <button type="button" className="text-left hover:underline" onClick={() => onOpen(r.id)}>
            {runTitle(r)}
          </button>
          <span className="flex items-center gap-2">
            <StatusBadge run={r} />
            <span className="tabular-nums font-medium">{pct(r.score)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Results ─────────────────────────────────────────────────────────

function ResultsPanel({
  runs,
  runId,
  onSelect,
}: {
  runs: ExamRun[]
  runId: string | undefined
  onSelect: (id: string) => void
}) {
  const [verdict, setVerdict] = useState<ExamVerdict | "">("")
  const [chapter, setChapter] = useState("")
  const run = useExamRun(runId)
  const active = isRunActive(run.data)
  const answers = useExamAnswers(runId, { verdict: verdict || undefined, chapter: chapter || undefined }, active)

  if (!runId) {
    return <p className="text-muted-foreground text-sm">No run selected. Start one, or pick one from History.</p>
  }
  if (run.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Could not load that run: {apiErrorMessage(run.error, "unknown error")}
      </p>
    )
  }
  if (!run.data) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading run…
      </p>
    )
  }
  const r = run.data
  const chapters = Object.entries(r.by_chapter ?? {})
  const list = answers.data ?? []
  const counts = list.reduce(
    (acc, a) => {
      if (a.verdict) acc[a.verdict] += 1
      return acc
    },
    { correct: 0, partial: 0, wrong: 0 } as Record<ExamVerdict, number>,
  )

  const exportCsv = () => downloadBlob(`prism-exam-${r.tier}-${r.id.slice(0, 8)}.csv`, new Blob([answersToCsv(r, list)], { type: "text/csv;charset=utf-8" }))
  const exportMd = () => downloadBlob(`prism-exam-${r.tier}-${r.id.slice(0, 8)}.md`, new Blob([answersToMarkdown(r, list)], { type: "text/markdown;charset=utf-8" }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="exam-run-select" className="text-sm">
          Run
        </Label>
        <select
          id="exam-run-select"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value={runId}
          onChange={(e) => onSelect(e.target.value)}
        >
          {runs.map((x) => (
            <option key={x.id} value={x.id}>
              {runTitle(x)} · {pct(x.score)}
            </option>
          ))}
          {!runs.some((x) => x.id === runId) && <option value={runId}>{runTitle(r)}</option>}
        </select>
        <span className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={!list.length}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportMd} disabled={!list.length}>
            <Download className="mr-1 h-4 w-4" /> Markdown
          </Button>
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{runTitle(r)}</CardTitle>
            <CardDescription>
              <StatusBadge run={r} /> <span className="ml-1">{r.tier}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScoreLine run={r} />
            {active && (
              <>
                <Progress value={r.total ? Math.round((r.done / r.total) * 100) : 0} aria-label="run progress" />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {r.done} / {r.total} answered · {pointsOf(list)} points so far
                </p>
              </>
            )}
            {r.error && (
              <p className="text-destructive text-xs" role="alert">
                {r.error}
              </p>
            )}
            <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <dt>Started</dt>
              <dd>{when(r.started_at ?? r.created_at)}</dd>
              <dt>Finished</dt>
              <dd>{when(r.completed_at)}</dd>
              <dt>Engine</dt>
              <dd className="font-mono">{shortSha(r.engine_sha)}</dd>
              <dt>Judge</dt>
              <dd>{r.judge_model ?? "—"}</dd>
              <dt>Questions</dt>
              <dd>
                {r.total} (set v{r.question_set_version ?? "?"})
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By chapter</CardTitle>
            <CardDescription>
              {counts.correct} correct · {counts.partial} partial · {counts.wrong} wrong
              {r.agents && (
                <>
                  {" "}
                  · answered by{" "}
                  {Object.entries(r.agents.by_agent)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => `${k} ${v}`)
                    .join(", ")}
                  {r.agents.aura_consults > 0 && ` · Aura consulted ${r.agents.aura_consults}×`}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chapters.length ? (
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs">
                  <tr>
                    <th className="py-1 font-medium">Chapter</th>
                    <th className="py-1 text-right font-medium">Qs</th>
                    <th className="py-1 text-right font-medium">Correct</th>
                    <th className="py-1 text-right font-medium">Partial</th>
                    <th className="py-1 text-right font-medium">Wrong</th>
                    <th className="py-1 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map(([key, c]) => (
                    <tr key={key} className="border-t">
                      <td className="py-1">
                        <button
                          type="button"
                          className={cn("text-left hover:underline", chapter === key && "font-semibold")}
                          onClick={() => setChapter(chapter === key ? "" : key)}
                        >
                          {c.title || key}
                        </button>
                      </td>
                      <td className="py-1 text-right tabular-nums">{c.n}</td>
                      <td className="py-1 text-right tabular-nums">{c.correct}</td>
                      <td className="py-1 text-right tabular-nums">{c.partial}</td>
                      <td className="py-1 text-right tabular-nums">{c.wrong}</td>
                      <td className="py-1 text-right font-medium tabular-nums">{pct(c.score, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground text-sm">
                {active ? "Chapter scores appear when the run finalises." : "No chapter breakdown on file for this run."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Answers</span>
        {(["", "correct", "partial", "wrong"] as const).map((v) => (
          <Button
            key={v || "all"}
            type="button"
            size="sm"
            variant={verdict === v ? "default" : "outline"}
            onClick={() => setVerdict(v)}
            aria-pressed={verdict === v}
          >
            {v || "all"}
          </Button>
        ))}
        {chapter && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setChapter("")}>
            chapter: {r.by_chapter?.[chapter]?.title ?? chapter} ✕
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs">{list.length} shown</span>
      </div>

      {answers.isLoading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading answers…
        </p>
      ) : list.length ? (
        <ul className="space-y-2">
          {list.map((a) => (
            <AnswerRow key={a.id} a={a} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          {active ? "Answers appear here as each question is scored." : "No answers match this filter."}
        </p>
      )}
    </div>
  )
}

function AnswerRow({ a }: { a: ExamAnswer }) {
  const [open, setOpen] = useState(a.verdict !== "correct")
  const consulted = (a.contributing_agents ?? []).filter((x) => x !== a.agent)
  return (
    <li className="rounded-md border">
      <button
        type="button"
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-muted-foreground w-10 font-mono text-xs">{a.question_id}</span>
        <VerdictBadge verdict={a.verdict} />
        <span className="flex-1">{a.question}</span>
        <span className="text-muted-foreground text-xs">
          {a.agent ?? "—"}
          {consulted.length > 0 && ` · consulted ${consulted.join(", ")}`}
          {a.page ? ` · p.${a.page}` : ""}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t px-3 py-2 text-sm">
          <p>
            <span className="font-semibold">Expected.</span> {a.expected}
          </p>
          <p className="whitespace-pre-wrap">
            <span className="font-semibold">IG.</span> {a.answer ?? <span className="text-muted-foreground">(no answer)</span>}
          </p>
          {a.missing && a.missing.length > 0 && (
            <p>
              <span className="font-semibold">Missing.</span> {a.missing.join("; ")}
            </p>
          )}
          {a.reason && (
            <p>
              <span className="font-semibold">Judge.</span> {a.reason}
            </p>
          )}
          {a.error && (
            <p className="text-destructive">
              <span className="font-semibold">Error.</span> {a.error}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {a.elapsed_s !== null ? `${a.elapsed_s.toFixed(1)} s` : ""}
            {a.session_id ? ` · session ${a.session_id}` : ""}
          </p>
        </div>
      )}
    </li>
  )
}

// ─── History ─────────────────────────────────────────────────────────

function HistoryPanel({
  runs,
  loading,
  onOpen,
}: {
  runs: ExamRun[]
  loading: boolean
  onOpen: (id: string) => void
}) {
  const [pair, setPair] = useState<string[]>([])
  const [a, b] = pair
  const diff = useExamDiff(a, b)

  const toggle = (id: string) => {
    setPair((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)))
  }

  if (loading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading runs…
      </p>
    )
  }
  if (!runs.length) return <p className="text-muted-foreground text-sm">No runs on this tier yet.</p>

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Tick two runs to compare them: the earlier one is &ldquo;before&rdquo;, the later &ldquo;after&rdquo;.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="py-1 font-medium">
                <GitCompareArrows className="inline h-3.5 w-3.5" />
              </th>
              <th className="py-1 font-medium">Run</th>
              <th className="py-1 font-medium">Status</th>
              <th className="py-1 text-right font-medium">Score</th>
              <th className="py-1 text-right font-medium">Done</th>
              <th className="py-1 font-medium">Engine</th>
              <th className="py-1 font-medium">Started</th>
              <th className="py-1 font-medium">Finished</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1">
                  <input
                    type="checkbox"
                    aria-label={`compare ${runTitle(r)}`}
                    checked={pair.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    disabled={r.status !== "complete" && !pair.includes(r.id)}
                  />
                </td>
                <td className="py-1">
                  <button type="button" className="text-left hover:underline" onClick={() => onOpen(r.id)}>
                    {runTitle(r)}
                  </button>
                  {r.question_set_version && (
                    <span className="text-muted-foreground ml-1 text-xs">set v{r.question_set_version}</span>
                  )}
                </td>
                <td className="py-1">
                  <StatusBadge run={r} />
                </td>
                <td className="py-1 text-right font-medium tabular-nums">{pct(r.score)}</td>
                <td className="py-1 text-right tabular-nums">
                  {r.done}/{r.total}
                </td>
                <td className="py-1 font-mono text-xs">{shortSha(r.engine_sha)}</td>
                <td className="py-1 text-xs">{when(r.started_at ?? r.created_at)}</td>
                <td className="py-1 text-xs">{when(r.completed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {a && b && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compare</CardTitle>
            <CardDescription>
              {diff.data
                ? `${runTitle(diff.data.run_a)} (${pct(diff.data.run_a.score)}) → ${runTitle(diff.data.run_b)} (${pct(diff.data.run_b.score)})`
                : diff.isError
                  ? apiErrorMessage(diff.error, "Could not compare those runs")
                  : "Comparing…"}
            </CardDescription>
          </CardHeader>
          {diff.data && (
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge className={cn("border-0", VERDICT_STYLE.correct)}>{diff.data.improved.length} improved</Badge>
                <Badge className={cn("border-0", VERDICT_STYLE.wrong)}>{diff.data.regressed.length} regressed</Badge>
                <Badge variant="outline">{diff.data.unchanged_count} unchanged</Badge>
                <Badge variant="outline">{diff.data.routing_changes.length} routing changes</Badge>
              </div>
              {diff.data.by_chapter.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-left text-xs">
                    <tr>
                      <th className="py-1 font-medium">Chapter</th>
                      <th className="py-1 text-right font-medium">Before</th>
                      <th className="py-1 text-right font-medium">After</th>
                      <th className="py-1 text-right font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.data.by_chapter.map((c) => (
                      <tr key={c.chapter} className="border-t">
                        <td className="py-1">{c.title}</td>
                        <td className="py-1 text-right tabular-nums">{pct(c.before, 0)}</td>
                        <td className="py-1 text-right tabular-nums">{pct(c.after, 0)}</td>
                        <td
                          className={cn(
                            "py-1 text-right tabular-nums",
                            (c.delta ?? 0) > 0 && "text-emerald-700",
                            (c.delta ?? 0) < 0 && "text-red-700",
                          )}
                        >
                          {c.delta === null ? "—" : `${c.delta > 0 ? "+" : ""}${(c.delta * 100).toFixed(0)} pts`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <DiffList title="Improved" items={diff.data.improved} />
              <DiffList title="Regressed" items={diff.data.regressed} />
              <DiffList title="Routing changes" items={diff.data.routing_changes} routing />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

function DiffList({ title, items, routing = false }: { title: string; items: DiffRecord[]; routing?: boolean }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-sm font-semibold">
        {title} ({items.length})
      </p>
      <ul className="mt-1 space-y-1 text-sm">
        {items.map((d) => (
          <li key={`${title}-${d.question_id}`} className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground w-10 font-mono text-xs">{d.question_id}</span>
            {routing ? (
              <span className="text-xs">
                {d.agent_before ?? "—"} → {d.agent_after ?? "—"}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <VerdictBadge verdict={d.before} /> → <VerdictBadge verdict={d.after} />
              </span>
            )}
            <span className="flex-1 truncate">{d.question}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Questions ───────────────────────────────────────────────────────

function setToJson(qs: QuestionSet): string {
  return JSON.stringify({ name: qs.name, pass_mark: qs.pass_mark, chapters: qs.chapters, questions: qs.questions }, null, 2)
}

/** Matches the server's cap (`importer.MAX_BYTES`); checked here only to fail fast. */
const MAX_IMPORT_BYTES = 2 * 1024 * 1024

function QuestionsPanel({ superAdmin }: { superAdmin: boolean }) {
  const active = useActiveQuestionSet(superAdmin)
  const sets = useExamQuestionSets()
  const replace = useReplaceQuestionSet()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  // Which saved set is open below. A super-admin starts on the active set, as before.
  const [viewId, setViewId] = useState<string | undefined>(undefined)
  const viewed = useExamQuestionSet(viewId)

  const shown: QuestionSet | undefined = viewId ? viewed.data : superAdmin ? active.data : undefined

  const grouped = useMemo(() => {
    const qs = shown
    if (!qs) return []
    return Object.entries(qs.chapters).map(([key, title]) => ({
      key,
      title,
      questions: qs.questions.filter((q) => q.chapter === key),
    }))
  }, [shown])

  const beginEdit = () => {
    if (!active.data) return
    setDraft(setToJson(active.data))
    setEditing(true)
  }

  const save = () => {
    const v = validateQuestionSet(draft)
    if (!v.ok) {
      toast.error(v.error)
      return
    }
    replace.mutate(v.value, {
      onSuccess: (res) => {
        toast.success(`Question set saved as v${res.version} (${res.count ?? v.value.questions.length} questions) and made active`)
        setEditing(false)
        setViewId(undefined)
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not save the question set")),
    })
  }

  if (superAdmin && active.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Could not load the question set: {apiErrorMessage(active.error, "unknown error")}
      </p>
    )
  }
  if (superAdmin && !active.data) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading question set…
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {superAdmin && active.data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Active: {active.data.name} <span className="text-muted-foreground font-normal">v{active.data.version}</span>
            </CardTitle>
            <CardDescription>
              {active.data.questions.length} questions across {Object.keys(active.data.chapters).length} chapters · pass mark{" "}
              {pct(active.data.pass_mark, 0)}
              {sets.data && sets.data.length > 1 && ` · ${sets.data.length} versions on file`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-xs">
              Saving creates a new version and makes it the active set for future runs; earlier runs keep the
              version they were marked against. Each question needs a unique id, a chapter key from the
              chapters map, the question text and the expected answer.
            </p>
            {editing ? (
              <>
                <Textarea
                  aria-label="question set JSON"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[360px] font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={save} disabled={replace.isPending}>
                    {replace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save as new version
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={beginEdit}>
                Edit question set
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!editing && (
        <>
          <SavedSetsCard
            sets={sets.data ?? []}
            loading={sets.isLoading}
            superAdmin={superAdmin}
            viewId={viewId ?? (superAdmin ? active.data?.id : undefined)}
            onView={setViewId}
          />
          <ImportCard onSaved={(id) => setViewId(id)} />
        </>
      )}

      {!editing && viewId && viewed.isError && (
        <p className="text-destructive text-sm" role="alert">
          Could not load that set: {apiErrorMessage(viewed.error, "unknown error")}
        </p>
      )}

      {!editing && shown && viewId && (
        <p className="text-sm font-medium">
          Showing {setLabel(shown)} · {shown.questions.length} questions
        </p>
      )}

      {!editing &&
        grouped.map((g) => (
          <Card key={g.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {g.title} <span className="text-muted-foreground font-normal">· {g.questions.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {g.questions.map((q) => (
                  <li key={q.id} className="grid grid-cols-[3rem_1fr] gap-2">
                    <span className="text-muted-foreground font-mono text-xs">
                      {q.id}
                      {q.page ? <span className="block">p.{q.page}</span> : null}
                    </span>
                    <span>
                      <span className="block whitespace-pre-line">{q.q}</span>
                      <span className="text-muted-foreground block text-xs">{q.expected}</span>
                      {q.basis && <span className="text-muted-foreground block text-xs italic">Basis: {q.basis}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}

function SavedSetsCard({
  sets,
  loading,
  superAdmin,
  viewId,
  onView,
}: {
  sets: QuestionSetSummary[]
  loading: boolean
  superAdmin: boolean
  viewId: string | undefined
  onView: (id: string) => void
}) {
  const activate = useActivateQuestionSet()
  const share = useShareQuestionSet()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Saved question sets</CardTitle>
        <CardDescription>
          {superAdmin
            ? "Every set on this tier. Pick one on the Run tab to run it; share a set to let granted users run it."
            : "Your sets and the ones shared with you. Pick one on the Run tab to run it."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sets…
          </p>
        ) : !sets.length ? (
          <p className="text-muted-foreground text-sm">No sets yet. Import a spreadsheet below.</p>
        ) : (
          <ul className="divide-y text-sm">
            {sets.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
                <button
                  type="button"
                  className={cn("text-left hover:underline", viewId === x.id && "font-semibold")}
                  onClick={() => onView(x.id)}
                >
                  {setLabel(x)}
                </button>
                <span className="text-muted-foreground text-xs">{x.count ?? "?"} questions</span>
                {x.is_active && <Badge variant="outline">active</Badge>}
                {x.shared && <Badge variant="outline">shared</Badge>}
                {superAdmin && (
                  <span className="ml-auto flex gap-2">
                    {!x.is_active && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={activate.isPending}
                        onClick={() =>
                          activate.mutate(x.id, {
                            onSuccess: () => toast.success(`${setLabel(x)} is now the active set`),
                            onError: (e) => toast.error(apiErrorMessage(e, "Could not make that set active")),
                          })
                        }
                      >
                        Make active
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={share.isPending}
                      onClick={() =>
                        share.mutate(
                          { setId: x.id, shared: !x.shared },
                          {
                            onSuccess: () => toast.success(x.shared ? `${setLabel(x)} is no longer shared` : `${setLabel(x)} is shared`),
                            onError: (e) => toast.error(apiErrorMessage(e, "Could not change sharing")),
                          },
                        )
                      }
                    >
                      <Share2 className="mr-1 h-4 w-4" /> {x.shared ? "Unshare" : "Share"}
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ImportCard({ onSaved }: { onSaved: (id: string) => void }) {
  const imp = useImportQuestionSet()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [preview, setPreview] = useState<ImportResult | null>(null)

  const pick = (f: File | null) => {
    setPreview(null)
    if (f && f.size > MAX_IMPORT_BYTES) {
      toast.error("That file is larger than 2 MB")
      setFile(null)
      return
    }
    setFile(f)
    if (f && !name) setName(f.name.replace(/\.xlsx$/i, ""))
  }

  const run = (dryRun: boolean) => {
    if (!file) return
    imp.mutate(
      { file, name, dryRun },
      {
        onSuccess: (res) => {
          if (dryRun) {
            setPreview(res)
            return
          }
          toast.success(`Saved "${name.trim()}" — ${res.count} questions`)
          setPreview(null)
          setFile(null)
          setName("")
          if (res.question_set) onSaved(res.question_set.id)
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not read that workbook")),
      },
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Import a spreadsheet</CardTitle>
        <CardDescription>
          An .xlsx with a <strong>Questions</strong> tab (Question ID, Question Text; optional Chapter and
          Basis), an optional <strong>Options</strong> tab (Question ID, Option — one row per option, in
          order) and an <strong>Answers</strong> tab (Question ID, Expected Answer — a letter or the option
          text for multiple choice). A question with no text or no answer is skipped and listed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="exam-import-file">Workbook (.xlsx)</Label>
            <Input
              id="exam-import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-import-name">Set name</Label>
            <Input
              id="exam-import-name"
              value={name}
              maxLength={120}
              placeholder="e.g. Accreditation — multiple choice"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => run(true)} disabled={!file || imp.isPending}>
            {imp.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Preview
          </Button>
          <Button type="button" onClick={() => run(false)} disabled={!preview || !preview.count || !name.trim() || imp.isPending}>
            Save as named set
          </Button>
        </div>
        {preview && (
          <div className="space-y-2 rounded-md border p-3 text-sm" aria-label="import preview">
            <p>
              <span className="font-semibold">{preview.count} questions</span> ({preview.multiple_choice} multiple choice) across{" "}
              {Object.keys(preview.chapters).length} chapters
              {preview.skipped.length > 0 && ` · ${preview.skipped.length} skipped`}
            </p>
            {preview.skipped.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Skipped: {preview.skipped.map((x) => `${x.id} (${x.reason})`).join(", ")}
              </p>
            )}
            {preview.warnings.map((w) => (
              <p key={w} className="text-xs text-amber-700 dark:text-amber-300">
                {w}
              </p>
            ))}
            {preview.sample.length > 0 && (
              <ol className="space-y-1 text-xs">
                {preview.sample.map((q) => (
                  <li key={q.id}>
                    <span className="text-muted-foreground font-mono">{q.id}</span>{" "}
                    <span className="whitespace-pre-line">{q.q}</span>
                    <span className="text-muted-foreground block">→ {q.expected}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Access (super-admin only) ───────────────────────────────────────

function AccessPanel() {
  const grants = useExamGrants()
  const put = usePutGrant()
  const del = useDeleteGrant()
  const [email, setEmail] = useState("")

  const add = () => {
    if (!email.trim()) return
    put.mutate(email, {
      onSuccess: (res) => {
        toast.success(`Granted ${res.email} (${res.role})`)
        setEmail("")
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not grant access")),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Who else can run exams</CardTitle>
        <CardDescription>
          A granted account (manager or above) reaches this page at /prism-exam. It sees its own sets and the
          ones you share, and only its own runs, up to five runs in 24 hours. Shared sets show their questions
          and expected answers to every granted account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1 space-y-1.5">
            <Label htmlFor="exam-grant-email">Account email</Label>
            <Input id="exam-grant-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="button" onClick={add} disabled={!email.trim() || put.isPending}>
            Grant access
          </Button>
        </div>
        {grants.isError ? (
          <p className="text-destructive text-sm" role="alert">
            Could not load grants: {apiErrorMessage(grants.error, "unknown error")}
          </p>
        ) : !grants.data?.length ? (
          <p className="text-muted-foreground text-sm">{grants.isLoading ? "Loading…" : "Nobody else has access."}</p>
        ) : (
          <ul className="divide-y text-sm">
            {grants.data.map((g) => (
              <li key={g.user_id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {g.email ?? g.user_id}
                  <span className="text-muted-foreground ml-2 text-xs">since {when(g.granted_at)}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={del.isPending}
                  onClick={() =>
                    del.mutate(g.user_id, {
                      onSuccess: () => toast.success(`Revoked ${g.email ?? g.user_id}`),
                      onError: (e) => toast.error(apiErrorMessage(e, "Could not revoke access")),
                    })
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
