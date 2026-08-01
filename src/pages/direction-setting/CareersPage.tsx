import { Link } from "react-router-dom"
import { ArrowRight, Compass, Loader2, ListOrdered, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useCareerAreas } from "@/hooks/direction-setting/useJourney"
import type { RoleFamilyAffinity } from "@/types/direction-setting"

/**
 * Stage 3 — "what kind of work suits me?"
 *
 * Ranked role families, scored against the caller's PRISM. Three things this
 * page insists on:
 *
 * 1. **An empty result is not an error.** The backend answers 200 with
 *    `families: []` and a `note` when there's no PRISM on file — the normal
 *    state of someone who reached Stage 3 before Stage 1. The note is the copy;
 *    rendering a red failure box over it would be both wrong and discouraging.
 *    (`useCareerAreas` sets `retry: false` for exactly this reason: a real
 *    failure here is a real fault, worth surfacing straight away.)
 * 2. **Determinism is a feature, said out loud.** The same profile always
 *    produces the same ranking, and every number on the page is inspectable —
 *    the affinity, the distance it came from, and how many dimensions fed it.
 *    A user who can't tell whether a score is a measurement or a mood has no
 *    reason to trust it.
 * 3. **A ranking is a shortlist, not a verdict.** Nothing here says a person
 *    can't do the work at the bottom of the list — it says which families ask
 *    for less adaptation from how they already prefer to work.
 */

/**
 * Pivot-difficulty bands. The backend owns the vocabulary, so this is a lookup
 * with a neutral default rather than an exhaustive union — an unrecognised band
 * renders plainly instead of disappearing.
 */
const PIVOT_CLASS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  easy: "bg-emerald-100 text-emerald-800 border-emerald-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  hard: "bg-orange-100 text-orange-800 border-orange-200",
}

/** Plain-language read of a band, so the badge isn't jargon on its own. */
const PIVOT_MEANING: Record<string, string> = {
  low: "close to how you already work",
  easy: "close to how you already work",
  moderate: "a real but ordinary stretch",
  medium: "a real but ordinary stretch",
  high: "a deliberate change of gear",
  hard: "a deliberate change of gear",
}

function bandKey(band: string): string {
  return band.trim().toLowerCase()
}

function FamilyRow({ family, rank }: { family: RoleFamilyAffinity; rank: number }) {
  const key = bandKey(family.pivotDifficulty)
  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-medium text-muted-foreground">
          {rank}
        </span>
        <span className="font-medium">{family.family}</span>
        <Badge className={cn("border", PIVOT_CLASS[key])}>
          {family.pivotDifficulty} pivot
        </Badge>
        <span className="ml-auto text-sm text-muted-foreground">
          {Math.round(family.affinity)} / 100
        </span>
      </div>

      <Progress
        className="mt-3"
        value={family.affinity}
        aria-label={`${family.family} affinity`}
      />

      <p className="mt-2 text-sm text-muted-foreground">
        {PIVOT_MEANING[key] ?? "moving into this asks for some adaptation"} — scored
        across {family.dimensionsConsidered} of your behavioural dimensions, at a
        distance of {family.distance.toFixed(2)} from the family&apos;s profile.
      </p>
    </li>
  )
}

/** No PRISM on file. The backend explains why; we add the way out. */
function NoDataYet({ note }: { note: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Nothing to rank yet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{note}</p>
        <p>
          This stage works by comparing how you prefer to work against what each kind
          of role tends to ask for — so it needs your side of that comparison before it
          can say anything worth reading. Nothing here is lost in the meantime.
        </p>
        <Button asChild>
          <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>
            Add your PRISM
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function CareersPage() {
  const { data, isLoading, isError } = useCareerAreas()

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Working out which kinds of work suit you…
        </div>
      </div>
    )
  }

  // `retry: false` means a failure lands here immediately. Say so plainly —
  // this is a fault on our side, not a gap in what the user has given us.
  if (isError || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            We couldn&apos;t work out your career areas just now. Refresh to try again
            — nothing you&apos;ve added has been lost.
          </CardContent>
        </Card>
      </div>
    )
  }

  const families = data.families ?? []
  const ladders = data.skillLadders ?? []
  const empty = families.length === 0

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">What kind of work suits you</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Families of roles, ordered by how closely each one matches the way you
          already prefer to work. It&apos;s a shortlist to explore, not a ceiling —
          nothing further down this list is off-limits to you.
        </p>
      </header>

      {empty ? (
        <NoDataYet
          note={
            data.note ??
            "We don't have enough about you yet to rank anything honestly."
          }
        />
      ) : (
        <>
          <section aria-labelledby="career-families">
            <div className="mb-2 flex items-baseline justify-between">
              <h2
                id="career-families"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <Compass className="h-4 w-4 text-muted-foreground" aria-hidden />
                Role families, best match first
              </h2>
              {data.dimensionsEvaluated !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {data.dimensionsEvaluated} dimensions evaluated
                </span>
              )}
            </div>
            <ul className="space-y-3">
              {families.map((family, i) => (
                <FamilyRow key={family.family} family={family} rank={i + 1} />
              ))}
            </ul>
          </section>

          {ladders.length > 0 && (
            <section aria-labelledby="career-ladders" className="space-y-3">
              <h2
                id="career-ladders"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <ListOrdered className="h-4 w-4 text-muted-foreground" aria-hidden />
                How you&apos;d actually get there
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {ladders.map((ladder) => (
                  <Card key={ladder.family}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{ladder.family}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {ladder.steps.map((step, i) => (
                          <li key={step} className="flex gap-2 text-sm">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] text-muted-foreground">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <footer className="space-y-2 border-t pt-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          This ranking is deterministic: the same profile always produces the same
          order. There&apos;s no model guessing here and no randomness — every number
          above comes from comparing your dimensions with the ones a family of roles
          tends to ask for, and you can see all of them.
        </p>
      </footer>
    </div>
  )
}
