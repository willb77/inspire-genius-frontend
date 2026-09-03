import { useState } from "react"
import { toast } from "sonner"
import { Clapperboard, Loader2, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import CastPicker from "@/components/prism/narrative/CastPicker"
import ProfileMarkdown from "@/components/prism/narrative/ProfileMarkdown"
import NarrativeExportButtons from "@/components/prism/narrative/NarrativeExportButtons"
import { mapWithConcurrency } from "@/lib/mapWithConcurrency"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { COLLABORATIVE } from "@/types/character-lab"
import type { NarrativeDoc } from "@/lib/exportNarrative"
import type { ScenarioCopy, ScenarioPort } from "./ports"

const MAX_CAST = 4

/** Same bound, same measured reason as the comparison and the write-up. */
const SCENARIO_CONCURRENCY = 3

type Result = { individual: Record<string, string>; collaborative: string }

/**
 * Put PRISM subjects into a situation and read back how they behave.
 *
 * Each subject gets their OWN request, plus one for the collaborative read.
 * That is not a stylistic choice: one request describing four subjects'
 * behaviour is exactly the unbounded generation that returns 503 against API
 * Gateway's 30s cap. Splitting by focus makes each generation short and lets
 * the individual reads land as they arrive.
 *
 * Takes a port and its words — see ./ports.ts. `port.store` is optional: a
 * caller with no scenario store gets no "Keep this run" button and no saved
 * list, rather than a button that silently does nothing.
 */
export default function ScenarioPanel({
  port,
  copy,
}: {
  port: ScenarioPort
  copy: ScenarioCopy
}) {
  const profiles = port.cast.subjects
  const isLoading = port.cast.isLoading
  const store = port.store

  const [selected, setSelected] = useState<string[]>([])
  const [situation, setSituation] = useState("")
  const [title, setTitle] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState("")

  const cast = (profiles ?? []).filter((p) => selected.includes(p.id))

  async function onRun() {
    if (!selected.length) {
      toast.error(copy.errorNeedOne)
      return
    }
    if (situation.trim().length < 3) {
      toast.error(copy.errorNeedSituation)
      return
    }
    setRunning(true)
    setResult({ individual: {}, collaborative: "" })
    const trimmed = situation.trim()

    // One focus per request: each subject, then the collaborative read.
    const focuses = [...selected, COLLABORATIVE]
    const outcomes = await mapWithConcurrency(focuses, SCENARIO_CONCURRENCY, (focus) =>
      port.run.run(selected, trimmed, focus),
    )

    const next: Result = { individual: {}, collaborative: "" }
    let failed = 0
    const firstOk = outcomes.find((o) => o.status === "fulfilled")
    if (firstOk && firstOk.status === "fulfilled") setNotice(firstOk.value.notice)
    outcomes.forEach((outcome, i) => {
      const focus = focuses[i]
      if (outcome.status === "fulfilled") {
        if (focus === COLLABORATIVE) next.collaborative = outcome.value.behaviour
        else next.individual[focus] = outcome.value.behaviour
      } else {
        failed += 1
        const who = cast.find((c) => c.id === focus)?.name ?? "the group"
        const marker = `_The read for ${who} could not be generated._`
        if (focus === COLLABORATIVE) next.collaborative = marker
        else next.individual[focus] = marker
      }
    })
    setResult(next)
    setRunning(false)
    if (failed) toast.warning(`${failed} of ${focuses.length} reads failed`)
  }

  async function onSave() {
    if (!result || !store) return
    try {
      await store.save.run({
        profile_ids: selected,
        title: title.trim() || situation.trim().slice(0, 60),
        situation: situation.trim(),
        character_names: cast.map((c) => c.name),
        result,
      })
      toast.success("Scenario saved")
    } catch (err) {
      toast.error(apiErrorMessage(err, copy.saveFailed))
    }
  }

  /**
   * One section per subject, in cast order, then the group read.
   *
   * Built on click so it exports what is on screen — including a section that
   * failed, which carries its own "could not be generated" marker. Dropping
   * those would make the export read as a complete scene that was simply
   * shorter, which is the failure this whole surface keeps guarding against.
   */
  function scenarioDoc(): NarrativeDoc {
    const cast_ = cast.length ? cast : []
    const sections = cast_
      .map((c) => ({ heading: c.name, body: result?.individual[c.id] ?? "" }))
      .concat([{ heading: "Together", body: result?.collaborative ?? "" }])
    return {
      title: title.trim() || situation.trim().slice(0, 60) || "Scenario",
      subtitle: copy.subtitle,
      notice,
      meta: [
        { label: copy.metaLabel, value: cast_.map((c) => c.name).join(", ") || "none selected" },
        { label: "Situation", value: situation.trim() },
      ],
      sections,
    }
  }

  function replay(s: { situation: string; character_ids: string[]; title: string; result: Result }) {
    setSituation(s.situation)
    setTitle(s.title)
    setSelected(s.character_ids)
    setResult({ individual: s.result.individual ?? {}, collaborative: s.result.collaborative ?? "" })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clapperboard className="h-4 w-4" aria-hidden /> {copy.castTitle}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{copy.castBlurb}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CastPicker
            idPrefix="scn"
            profiles={profiles ?? []}
            loading={isLoading}
            selected={selected}
            onChange={setSelected}
            max={MAX_CAST}
            min={1}
            empty={copy.castEmpty}
          />
          <div className="space-y-1.5">
            <Label htmlFor="cl-situation">The situation</Label>
            <Textarea
              id="cl-situation"
              rows={3}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="What are they walking into?"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {copy.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSituation(p)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-accent"
                >
                  {p.length > 46 ? `${p.slice(0, 46)}…` : p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-scenario-title">Name it (optional)</Label>
            <Input
              id="cl-scenario-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The hospital scene"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onRun} disabled={running || !selected.length}>
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running the scene…
                </>
              ) : (
                "Run the scenario"
              )}
            </Button>
            {store && result && !running && (
              <Button variant="secondary" onClick={onSave} disabled={store.save.pending}>
                {store.save.pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Keep this run
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              {title.trim() || "How it plays out"}
            </CardTitle>
            {!running && <NarrativeExportButtons build={scenarioDoc} label="a scenario" />}
          </CardHeader>
          <CardContent className="space-y-5">
            {cast.map((c) => (
              <div key={c.id}>
                {result.individual[c.id] ? (
                  <ProfileMarkdown text={result.individual[c.id]} />
                ) : running ? (
                  <Skeleton className="h-20 w-full" />
                ) : null}
              </div>
            ))}
            {result.collaborative ? (
              <ProfileMarkdown text={result.collaborative} />
            ) : running ? (
              <Skeleton className="h-20 w-full" />
            ) : null}
          </CardContent>
        </Card>
      )}

      {store && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved scenarios</CardTitle>
            <p className="text-xs text-muted-foreground">{copy.savedBlurb}</p>
          </CardHeader>
          <CardContent>
            {store.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : !store.scenarios?.length ? (
              <p className="text-sm text-muted-foreground">Nothing kept yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {store.scenarios.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title || s.situation}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.character_names.join(", ") || "cast not recorded"}
                        {s.created_at ? ` · ${new Date(s.created_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          replay({
                            situation: s.situation,
                            character_ids: s.character_ids,
                            title: s.title,
                            result: {
                              individual: s.result.individual ?? {},
                              collaborative: s.result.collaborative ?? "",
                            },
                          })
                        }
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${s.title || "scenario"}`}
                        onClick={async () => {
                          try {
                            await store.remove.run(s.id)
                            toast.success("Scenario deleted")
                          } catch {
                            toast.error("Could not delete")
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
