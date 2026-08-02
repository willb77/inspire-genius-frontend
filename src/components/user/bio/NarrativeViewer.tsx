/**
 * The Bio Capture narrative viewer.
 *
 * Three parts, all read-only:
 *   1. the six life modules with their status and a coverage indicator,
 *   2. an episodes timeline grouped by module (canonical order) and ordered by
 *      `ageAt` within each module,
 *   3. a call-to-action for the next suggested module.
 *
 * When nothing has been captured (`bioStarted === false`) the whole thing
 * collapses to an empty state that points at the Chronicle chat.
 */
import { useMemo } from "react"
import { Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  BIO_MODULE_TYPES,
  type BioCoverage,
  type BioModule,
  type MemberNarrative,
} from "@/types/bio"
import { groupEpisodesByModule, moduleLabel } from "@/lib/bio/clientMemoir"

/** Coverage states we colour distinctly; anything else renders neutral. */
function coverageTone(state: string): string {
  const s = state.toLowerCase()
  if (s === "covered" || s === "complete" || s === "strong")
    return "bg-emerald-500"
  if (s === "partial" || s === "in_progress" || s === "started")
    return "bg-amber-500"
  return "bg-slate-300"
}

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" {
  const s = status.toLowerCase()
  if (s === "complete" || s === "completed") return "default"
  if (s === "in_progress" || s === "started" || s === "active")
    return "secondary"
  return "outline"
}

/** A module card: status badge + the distilled one-liner + its coverage dots. */
function ModuleCard({
  module,
  coverage,
  isNext,
}: {
  module: BioModule
  coverage: BioCoverage[]
  isNext: boolean
}) {
  return (
    <Card className={cn(isNext && "ring-1 ring-primary")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">
            {moduleLabel(module.moduleType)}
          </CardTitle>
          <Badge variant={statusVariant(module.status)} className="capitalize">
            {module.status.replace(/_/g, " ") || "not started"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {module.distilledLine?.trim() ||
            "Not yet captured — this chapter is still blank."}
        </p>
        {coverage.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {coverage.map((c) => (
              <span
                key={`${c.moduleType}-${c.dimension}`}
                title={`${c.dimension}: ${c.state}`}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    coverageTone(c.state),
                  )}
                  aria-hidden
                />
                {c.dimension.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type NarrativeViewerProps = {
  narrative: MemberNarrative
  /** Nudge the member into the suggested module — wired to the chat panel. */
  onStartSuggested?: (moduleType: string) => void
}

export function NarrativeViewer({
  narrative,
  onStartSuggested,
}: NarrativeViewerProps) {
  const coverageByModule = useMemo(() => {
    const map = new Map<string, BioCoverage[]>()
    for (const c of narrative.coverage) {
      const list = map.get(c.moduleType) ?? []
      list.push(c)
      map.set(c.moduleType, list)
    }
    return map
  }, [narrative.coverage])

  // Modules in canonical order, falling back to synthesised placeholders so the
  // six chapters always show even before Chronicle has touched them.
  const modules = useMemo<BioModule[]>(() => {
    const byType = new Map(narrative.modules.map((m) => [m.moduleType, m]))
    return BIO_MODULE_TYPES.map(
      (moduleType) =>
        byType.get(moduleType) ?? {
          moduleType,
          status: "not_started",
          distilledLine: "",
          startedAt: null,
          completedAt: null,
        },
    )
  }, [narrative.modules])

  const grouped = useMemo(
    () => groupEpisodesByModule(narrative.episodes),
    [narrative.episodes],
  )

  if (!narrative.bioStarted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">Your story starts here</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Chronicle will guide you through six chapters of your life — from
              your background to the events and people who shaped you. Say hello
              in the chat to begin; what you capture will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {narrative.nextSuggestedModule && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <span>
                Suggested next:{" "}
                <span className="font-semibold">
                  {moduleLabel(narrative.nextSuggestedModule)}
                </span>
              </span>
            </div>
            {onStartSuggested && (
              <button
                type="button"
                onClick={() =>
                  onStartSuggested(narrative.nextSuggestedModule as string)
                }
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continue with Chronicle
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Chapters
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map((m) => (
            <ModuleCard
              key={m.moduleType}
              module={m}
              coverage={coverageByModule.get(m.moduleType) ?? []}
              isNext={m.moduleType === narrative.nextSuggestedModule}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Timeline
        </h2>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No episodes captured yet — keep talking to Chronicle and they'll
            appear here.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.moduleType}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {moduleLabel(group.moduleType)}
                </h3>
                <ol className="relative space-y-4 border-l pl-5">
                  {group.episodes.map((ep) => (
                    <li key={ep.episodeId} className="relative">
                      <span
                        className="absolute -left-[1.42rem] top-1.5 h-2 w-2 rounded-full bg-primary"
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{ep.title}</span>
                        {ep.era && (
                          <span className="text-xs text-muted-foreground">
                            {ep.era}
                            {ep.ageAt != null ? ` · age ${ep.ageAt}` : ""}
                          </span>
                        )}
                        {ep.openThread && (
                          <Badge variant="outline" className="text-[10px]">
                            open thread
                          </Badge>
                        )}
                      </div>
                      {ep.facts && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ep.facts}
                        </p>
                      )}
                      {ep.meaning && (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          {ep.meaning}
                        </p>
                      )}
                      {(ep.prismTags?.length ?? 0) > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {ep.prismTags!.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default NarrativeViewer
