import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Drama,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import BrainMap from "@/components/super-admin/character-lab/BrainMap"
import ScoreRow from "@/components/super-admin/character-lab/ScoreRow"
import {
  useAnalyseProfile,
  useExportProfile,
  useGenerateProfile,
  useRubric,
  useScoreBattery,
} from "@/hooks/super-admin/useCharacterLab"
import { exportProfileWord, saveCsv } from "@/lib/exportCharacterProfile"
import { mapWithConcurrency } from "@/lib/mapWithConcurrency"
import { SCORE_TYPES } from "@/types/character-lab"
import type {
  DerivedQuadrant,
  ScoreByType,
  ScoreType,
} from "@/types/character-lab"

const BEHAVIOUR_GROUP = "Behavior Preferences"

/**
 * How many analysis parts to have in flight at once.
 *
 * 3, from measurement — see {@link mapWithConcurrency}. Batteries are left
 * unbounded because they are short enough not to contend: eleven parts
 * completed in 10.2s wall with none close to the cap.
 */
const ANALYSIS_CONCURRENCY = 3

/** `partial` = some parts of a split battery returned and some did not. */
type BatteryState = "idle" | "running" | "done" | "partial" | "error"

/**
 * Character Lab — place a fictional character on the PRISM dimensions.
 *
 * A demonstration surface, and a deliberately honest one: everything it
 * produces is labelled synthetic, and nothing it produces is written to the
 * PRISM stores. See `services/agent-engine/app/routes/character_lab.py`.
 */
export default function CharacterLab() {
  const [name, setName] = useState("")
  const [source, setSource] = useState("")
  const [notes, setNotes] = useState("")
  const [scoreType, setScoreType] = useState<ScoreType>("Underlying")

  const [scores, setScores] = useState<Record<string, ScoreByType>>({})
  const [evidence, setEvidence] = useState<Record<string, string>>({})
  const [colours, setColours] = useState<Partial<Record<ScoreType, DerivedQuadrant[]>>>({})
  const [reading, setReading] = useState("")
  const [analysis, setAnalysis] = useState("")
  const [profiled, setProfiled] = useState<{ name: string; source: string } | null>(null)
  const [batteryState, setBatteryState] = useState<Record<string, BatteryState>>({})

  const { data: rubric, isLoading: rubricLoading, error: rubricError } = useRubric()
  const generate = useGenerateProfile()
  const battery = useScoreBattery()
  const analyse = useAnalyseProfile()
  const exporter = useExportProfile()

  // `generate` returns behaviour scores only, so the result it hands to the
  // batteries is already the anchor set — no filtering needed.
  const hasProfile = Object.keys(scores).length > 0
  // Memoised because the `?? []` fallback is a fresh array each render, which
  // would re-run every downstream memo that depends on it.
  const currentColours = useMemo(
    () => colours[scoreType] ?? colours.Underlying ?? [],
    [colours, scoreType],
  )
  const colourMap = useMemo(
    () => Object.fromEntries(currentColours.map((q) => [q.name, q.value])),
    [currentColours],
  )

  function reset() {
    setScores({})
    setEvidence({})
    setColours({})
    setReading("")
    setAnalysis("")
    setBatteryState({})
  }

  /**
   * Score one battery, in as many parts as the server says it needs.
   *
   * Parts run concurrently and each one's scores land as soon as it returns, so
   * a large battery fills in progressively rather than all at once. The split
   * exists because a single request for a whole group can exceed API Gateway's
   * 30s cap — Career Development Analysis (26 scales) returned 503 at 30.1s.
   *
   * A part that fails does not discard the parts that succeeded: the group is
   * marked `partial` and the scales that came back are still shown. Throwing the
   * lot away would turn a recoverable gap into an empty battery.
   */
  async function runBattery(
    group: string,
    parts: number,
    behaviours: Record<string, ScoreByType>,
    req: { name: string; source: string; notes: string },
  ) {
    setBatteryState((s) => ({ ...s, [group]: "running" }))
    const outcomes = await Promise.allSettled(
      Array.from({ length: parts }, (_, part) =>
        battery.mutateAsync({ ...req, group, behaviours, part }).then((result) => {
          setScores((s) => ({ ...s, ...result.scores }))
          setEvidence((e) => ({ ...e, ...result.evidence }))
          return result
        }),
      ),
    )

    const failed = outcomes.filter((o) => o.status === "rejected")
    const emptied = outcomes.reduce(
      (n, o) => n + (o.status === "fulfilled" ? o.value.missing.length : 0),
      0,
    )
    if (failed.length === parts) {
      setBatteryState((s) => ({ ...s, [group]: "error" }))
      toast.error(`${group} failed`)
    } else if (failed.length) {
      setBatteryState((s) => ({ ...s, [group]: "partial" }))
      toast.warning(`${group}: ${failed.length} of ${parts} parts failed`)
    } else {
      setBatteryState((s) => ({ ...s, [group]: "done" }))
      if (emptied) toast.warning(`${group}: ${emptied} scale(s) came back empty`)
    }
  }

  async function onGenerate() {
    if (!name.trim()) {
      toast.error("Give the character a name first.")
      return
    }
    if (!rubric) {
      toast.error("The rubric has not loaded — scores would be ungrounded. Reload and try again.")
      return
    }
    reset()
    const req = { name: name.trim(), source: source.trim(), notes: notes.trim() }
    try {
      const result = await generate.mutateAsync(req)
      setScores(result.scores)
      setEvidence(result.evidence)
      setColours(result.colours)
      setReading(result.reading)
      setProfiled({ name: result.name, source: result.source })
      if (result.missing.length) {
        toast.warning(`${result.missing.length} behaviour scale(s) came back empty`)
      }

      // Batteries run concurrently after the map. Each is its own request:
      // all 88 scales in one call would push a large generation against API
      // Gateway's 30s integration cap, which cannot be raised.
      const others = rubric.groups.filter((g) => g.group !== BEHAVIOUR_GROUP)
      setBatteryState(Object.fromEntries(others.map((g) => [g.group, "running" as BatteryState])))
      await Promise.allSettled(
        others.map((g) => runBattery(g.group, Math.max(1, g.parts ?? 1), result.scores, req)),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed"
      toast.error(`Could not build the profile — ${message}`)
    }
  }

  /**
   * Fetch the write-up in parts and stitch them in order.
   *
   * Split for the same reason the batteries are: seven sections of prose over 88
   * scores exceeded API Gateway's 30s cap and returned 503. Part 0 is fetched
   * first because it reports how many parts there are; the rest then run
   * concurrently. A part that fails leaves a visible marker rather than a
   * silently short write-up — a missing section reads as "nothing to say about
   * derailers", which is the opposite of true.
   */
  async function onAnalyse() {
    if (!profiled) return
    const req = {
      name: profiled.name,
      source: profiled.source,
      notes: notes.trim(),
      scores,
      colours: colourMap,
    }
    try {
      const first = await analyse.mutateAsync({ ...req, part: 0 })
      setAnalysis(first.analysis)
      if (first.parts <= 1) return

      const rest = await mapWithConcurrency(
        Array.from({ length: first.parts - 1 }, (_, i) => i + 1),
        ANALYSIS_CONCURRENCY,
        (part) => analyse.mutateAsync({ ...req, part }),
      )
      const chunks = [first.analysis]
      rest.forEach((outcome, i) => {
        if (outcome.status === "fulfilled") {
          chunks.push(outcome.value.analysis)
        } else {
          chunks.push(`_Section ${i + 2} of ${first.parts} could not be generated._`)
        }
      })
      setAnalysis(chunks.join("\n\n"))
      const failed = rest.filter((o) => o.status === "rejected").length
      if (failed) toast.warning(`${failed} of ${first.parts} analysis sections failed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed")
    }
  }

  async function onExportCsv(fmt: "wide" | "long") {
    if (!profiled) return
    try {
      const { filename, content } = await exporter.mutateAsync({
        name: profiled.name,
        source: profiled.source,
        scores,
        colours: colourMap,
        fmt,
      })
      saveCsv(filename, content)
      toast.success(`Saved ${filename}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    }
  }

  async function onExportWord() {
    if (!profiled || !rubric) return
    try {
      await exportProfileWord({
        name: profiled.name,
        source: profiled.source,
        notice: rubric.notice,
        reading,
        analysis,
        colours: currentColours,
        scores,
        evidence,
        rubric,
        scoreType,
      })
      toast.success("Saved the Word profile")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Word export failed")
    }
  }

  const busy = generate.isPending
  const batteriesRunning = Object.values(batteryState).filter((s) => s === "running").length

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Drama className="h-6 w-6" aria-hidden />
              Character Lab
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Place a fictional character on the PRISM dimensions and read the profile back.
              Every scale is scored against a written definition — what it measures and what
              both ends look like — so the result can be argued with rather than admired.
            </p>
          </div>
        </header>

        <div
          role="note"
          className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Synthetic profiles.</strong> Nothing here is a PRISM assessment or is stored
            against a person. Profiles live in this browser tab and in whatever you export —
            they are never written to the PRISM tables, and must not be pooled with real
            candidates for benchmarking or training.
          </span>
        </div>

        {rubricError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            The rubric could not be loaded, so scoring is disabled — without it the model would
            score the <em>names</em> of the scales rather than the constructs.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">The character</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cl-name">Name</Label>
                <Input
                  id="cl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sonny Corleone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-source">Source</Label>
                <Input
                  id="cl-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="The Godfather (Puzo, 1969)"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-notes">Notes (optional)</Label>
              <Textarea
                id="cl-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scenes, behaviour or context to ground the reading. Treated as evidence about the character."
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onGenerate} disabled={busy || rubricLoading || !!rubricError}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading the character…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Build profile
                  </>
                )}
              </Button>
              {batteriesRunning > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {batteriesRunning} batter{batteriesRunning === 1 ? "y" : "ies"} still scoring
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {rubricLoading && <Skeleton className="h-48 w-full" />}

        {hasProfile && rubric && (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  {profiled?.name}
                  {profiled?.source ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {profiled.source}
                    </span>
                  ) : null}
                </CardTitle>
                <Tabs value={scoreType} onValueChange={(v) => setScoreType(v as ScoreType)}>
                  <TabsList>
                    {SCORE_TYPES.map((t) => (
                      <TabsTrigger key={t} value={t}>
                        {t}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {rubric.score_types[scoreType]}
                </p>
                {reading && <p className="text-sm leading-relaxed">{reading}</p>}
                <BrainMap quadrants={currentColours} />
                <p className="text-xs text-muted-foreground">
                  The four colours are derived from the eight behaviour preferences below —
                  each is the mean of its pair. They are never scored directly.
                </p>
              </CardContent>
            </Card>

            {rubric.groups.map((group) => {
              const rows = group.dimensions.filter((d) => scores[d.key])
              const state = group.group === BEHAVIOUR_GROUP ? "done" : batteryState[group.group]
              if (!rows.length && state !== "running" && state !== "error") return null
              return (
                <Card key={group.group}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {group.group}
                      {state === "running" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                      {state === "error" && (
                        <span className="text-xs font-normal text-destructive">
                          could not be scored
                        </span>
                      )}
                      {state === "partial" && (
                        <span className="text-xs font-normal text-amber-600 dark:text-amber-500">
                          partly scored — some scales are missing, not zero
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{group.definition}</p>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {state === "running" && !rows.length && <Skeleton className="h-24 w-full" />}
                    {state === "error" && !rows.length && (
                      <p className="text-sm text-muted-foreground">
                        This battery returned nothing. The rest of the profile is unaffected —
                        it is missing, not zero.
                      </p>
                    )}
                    {rows.map((d) => (
                      <ScoreRow
                        key={d.key}
                        dimension={d}
                        scores={scores[d.key]}
                        scoreType={group.per_score_type ? scoreType : "Underlying"}
                        bands={rubric.bands}
                        evidence={evidence[d.key]}
                      />
                    ))}
                    {!group.per_score_type && rows.length > 0 && (
                      <p className="pt-1 text-xs text-muted-foreground">
                        This battery reports one value rather than three — it does not vary by
                        score type.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Analysis</CardTitle>
                <Button
                  variant="secondary"
                  onClick={onAnalyse}
                  disabled={analyse.isPending || batteriesRunning > 0}
                >
                  {analyse.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading the profile…
                    </>
                  ) : (
                    "Read the profile"
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {batteriesRunning > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Waiting for the remaining batteries — analysing now would read a partial
                    profile.
                  </p>
                ) : analysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {analysis}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not run yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={onExportWord}>
                  <FileText className="mr-2 h-4 w-4" /> Word profile
                </Button>
                <Button variant="outline" onClick={() => onExportCsv("wide")} disabled={exporter.isPending}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Wide CSV (report layout)
                </Button>
                <Button variant="outline" onClick={() => onExportCsv("long")} disabled={exporter.isPending}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Long CSV (one row per score)
                </Button>
                <p className="w-full text-xs text-muted-foreground">
                  The wide CSV matches the PRISM report export column-for-column, so it can be
                  reshaped and compared with a real one. Both carry the synthetic-data notice.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SuperAdminLayout>
  )
}
