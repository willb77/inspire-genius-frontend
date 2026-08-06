import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { useRecordStageComplete } from "@/hooks/direction-setting/useJourney"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import {
  PortraitAgreementGrid,
  PortraitAnchorNote,
  PortraitCorroborating,
  PortraitDimensions,
  PortraitEvidence,
  PortraitNoPrism,
  PortraitQuadrants,
  PortraitSkeleton,
  PortraitSourceCoverage,
} from "@/components/lumen/portrait"
import { SelfPortraitNarrative } from "@/pages/lumen/SelfPortraitNarrative"

/**
 * Stage 2 — "what am I actually like?"
 *
 * This is **Lumen's Self-Portrait, surfaced inside the journey** — the same
 * composed read, the same hook, the same narrative card. There is exactly one
 * portrait engine in the product and it lives in Lumen; a second one here would
 * drift within a release and start telling the same person two different things
 * about themselves.
 *
 * The sections themselves are now shared components too, for the same reason at
 * one level down: this page and Lumen's kept private copies of every constant
 * and every block of JSX, and those copies had already diverged in ways nobody
 * chose. What legitimately differs is voice and navigation, so this page passes
 * its own titles and hands `<Link>`s in as slots — the shared components must
 * stay router-free, because Lumen's tests render without one.
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

  // Stage 2 is done when there is a portrait to read. `NothingYet` below is the
  // no-PRISM case — a correct render of nothing, which is not an outcome.
  useRecordStageComplete("2", Boolean(portrait))

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PortraitSkeleton testId="ds-portrait-loading" />
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

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">What you&apos;re actually like</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Here&apos;s what we can see so far — how you tend to work, what your
          instruments agree on, and where they pull in different directions.
          It&apos;s a mirror to think with, not a verdict on you.
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

      <SelfPortraitNarrative portrait={portrait} />

      {sources && (
        <PortraitSourceCoverage
          sources={sources}
          coverage={portrait.coverage}
          showCount
          footer={
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>
                Add what&apos;s missing
              </Link>
            </Button>
          }
        />
      )}

      {!portrait.prism ? (
        <PortraitNoPrism title="No PRISM yet" headline={portrait.headline}>
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>
              Request or upload PRISM
            </Link>
          </Button>
        </PortraitNoPrism>
      ) : (
        <>
          <PortraitQuadrants
            prism={portrait.prism}
            title="How you tend to show up"
          />
          <PortraitDimensions
            prism={portrait.prism}
            title="What sits underneath that"
          />
        </>
      )}

      <PortraitEvidence
        evidence={portrait.evidence ?? []}
        note={portrait.evidence_note}
        title="What your own words add"
      />

      <PortraitCorroborating
        instruments={portrait.corroborating}
        title="The other instruments we read"
      />

      <PortraitAgreementGrid
        convergences={portrait.convergences}
        tensions={portrait.tensions}
        convergenceTitle="What your instruments agree on"
        convergenceEmpty="Nothing corroborated yet — a second instrument is what would give us this."
        tensionPreamble={
          <p className="text-xs">
            Two instruments reading you differently isn&apos;t a mistake in you —
            it usually means the setting changes how you show up.
          </p>
        }
      />

      <PortraitAnchorNote />
    </div>
  )
}
