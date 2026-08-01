import { Link } from "react-router-dom"
import { AlertTriangle, Check, Handshake, Minus, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import { SelfPortraitNarrative } from "@/pages/lumen/SelfPortraitNarrative"
import type {
  PortraitSourceKey,
  PortraitSources,
  PrismQuadrant,
  PrismQuadrantScores,
} from "@/types/lumen"

/**
 * Stage 2 — "what am I actually like?"
 *
 * This is **Lumen's Self-Portrait, surfaced inside the journey** — the same
 * composed read, the same hook, the same narrative card. There is exactly one
 * portrait engine in the product and it lives in Lumen; a second one here would
 * drift within a release and start telling the same person two different things
 * about themselves.
 *
 * What this page adds over Lumen's own is *journey framing*: a completeness
 * readout that says plainly what the read rests on and what more data would buy,
 * and a route onward rather than a route into Lumen. The tensions — where two
 * instruments disagree about you — are kept front and centre rather than
 * averaged away, because a disagreement is usually the interesting part and
 * hiding it would make the page a horoscope.
 *
 * There is no error page for "no PRISM yet". That is the normal state of a new
 * arrival, not a fault, and it gets an explanation and a door back to Establish.
 */

const QUADRANT_CLASS: Record<PrismQuadrant, string> = {
  Green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Blue: "bg-blue-100 text-blue-800 border-blue-200",
  Red: "bg-red-100 text-red-800 border-red-200",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
}

// Manual order, matching the licensed reference — not the frontend's older
// BEHAVIOUR_CONFIG colouring, which rotates six of the eight dimensions.
const QUADRANT_ROWS: { key: keyof PrismQuadrantScores; label: PrismQuadrant }[] = [
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "red", label: "Red" },
  { key: "gold", label: "Gold" },
]

/**
 * The four evidence sources, and what each one buys if it is missing.
 *
 * Phrased as gain, never as deficiency: the reader may be out of work and
 * anxious, and "you haven't done X" reads very differently from "X would let us
 * corroborate this".
 */
const SOURCE_ROWS: { key: PortraitSourceKey; label: string; buys: string }[] = [
  {
    key: "prism",
    label: "PRISM",
    buys: "Gives everything else an anchor to be read against.",
  },
  {
    key: "assessments",
    label: "Other assessments",
    buys: "A second instrument is what turns one report into corroboration.",
  },
  {
    key: "resume",
    label: "Résumé",
    buys: "Adds a record of what you've done to weigh the tendencies against.",
  },
  {
    key: "bio",
    label: "Bio",
    buys: "How you'd describe yourself is a signal in its own right.",
  },
]

function PortraitSkeleton() {
  return (
    <div className="space-y-4" data-testid="ds-portrait-loading">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

/** What the read rests on, absences included — the absences are the point. */
function Completeness({
  sources,
  coverage,
}: {
  sources: PortraitSources
  coverage?: string
}) {
  const present = SOURCE_ROWS.filter((row) => sources[row.key]).length
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What this is built from</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {present} of {SOURCE_ROWS.length} sources on file. Everything below is read
          from those — where a source is missing, the read is thinner rather than
          wrong.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOURCE_ROWS.map(({ key, label, buys }) => {
            const has = sources[key]
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-sm",
                  has ? "border-emerald-200 bg-emerald-50/50" : "border-dashed"
                )}
              >
                {has ? (
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-label="on file"
                  />
                ) : (
                  <Minus
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-label="not on file"
                  />
                )}
                <span>
                  <span className="block font-medium">{label}</span>
                  {!has && (
                    <span className="block text-xs text-muted-foreground">{buys}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        {coverage && <p className="text-sm text-muted-foreground">{coverage}</p>}
        {present < SOURCE_ROWS.length && (
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>Add what&apos;s missing</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** The nothing-on-file state. Explained, with a door — never an error. */
function NothingYet() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">What you&apos;re actually like</h1>
      </header>
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nothing to read from yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This page reads back what your assessments, résumé and bio say about how
            you work. We don&apos;t have any of those on file yet, so there&apos;s
            nothing honest to show you here.
          </p>
          <p>
            Adding any one of them is enough to get a first read — a résumé on its own
            produces a genuine portrait, just a less corroborated one.
          </p>
          <Button asChild>
            <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>
              Tell us about you first
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PortraitPage() {
  const { data: portrait, isLoading, isError } = useSelfPortrait()

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PortraitSkeleton />
      </div>
    )
  }

  // A genuine transport failure is worth saying out loud — but softly, and
  // without implying anything the user did caused it.
  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            We couldn&apos;t put your portrait together just now. Refresh to try again
            — nothing you&apos;ve added has been lost.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!portrait) return <NothingYet />

  const sources = portrait.sources
  const hasPrism = Boolean(portrait.prism)

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">What you&apos;re actually like</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Here&apos;s what we can see so far — how you tend to work, what your
          instruments agree on, and where they pull in different directions. It&apos;s a
          mirror to think with, not a verdict on you.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {portrait.confidence && (
            <Badge variant="outline">Confidence: {portrait.confidence}</Badge>
          )}
          {portrait.instruments.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </header>

      {/* Lumen's narrative card, verbatim: plain-language read, a box to ask it
          questions, and PDF/Word export. Reused, not rebuilt. */}
      <SelfPortraitNarrative portrait={portrait} />

      {sources && <Completeness sources={sources} coverage={portrait.coverage} />}

      {hasPrism && portrait.prism ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              How you tend to show up
              <Badge className={QUADRANT_CLASS[portrait.prism.dominant_quadrant]}>
                {portrait.prism.dominant_quadrant} leads
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUADRANT_ROWS.map(({ key, label }) => {
              const value = portrait.prism?.quadrants[key as "green"]
              if (value === undefined) return null
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{Math.round(value)}</span>
                  </div>
                  <Progress value={value} />
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">No PRISM yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{portrait.headline}</p>
            <p>
              PRISM is the anchor the other sources get read against. Without it this
              page reads what you&apos;ve told us, but can&apos;t yet corroborate it.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>Request or upload PRISM</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {portrait.corroborating.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">The other instruments we read</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {portrait.corroborating.map((instrument) => (
              <div
                key={instrument.framework}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{instrument.framework}</span>
                  <Badge className={QUADRANT_CLASS[instrument.maps_to]}>
                    {instrument.maps_to}
                  </Badge>
                  <Badge variant="outline">
                    {instrument.agrees_with_prism ? "agrees" : "differs"}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  confidence {instrument.confidence.toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Handshake className="h-5 w-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">What your instruments agree on</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {portrait.convergences.length === 0 ? (
              <p>
                Nothing corroborated yet — a second instrument is what would give us
                this.
              </p>
            ) : (
              portrait.convergences.map((line) => <p key={line}>{line}</p>)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Where they pull apart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {portrait.tensions.length === 0 ? (
              <p>No tensions surfaced. Your instruments tell a consistent story.</p>
            ) : (
              <>
                <p className="text-xs">
                  Two instruments reading you differently isn&apos;t a mistake in you —
                  it usually means the setting changes how you show up.
                </p>
                {portrait.tensions.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        PRISM is the anchor — where another instrument disagrees, PRISM leads and the
        difference is shown rather than resolved away.
      </p>
    </div>
  )
}
