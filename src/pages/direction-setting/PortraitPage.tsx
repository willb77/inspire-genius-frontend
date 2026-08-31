import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { useRecordStageComplete } from "@/hooks/direction-setting/useJourney"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import {
  PortraitAnchorNote,
  PortraitCorroborating,
  PortraitDimensions,
  PortraitNoPrism,
  PortraitSkeleton,
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
 * The sections themselves are shared components, for the same reason at one
 * level down: this page and Lumen's kept private copies of every constant and
 * every block of JSX, and those copies had already diverged in ways nobody
 * chose. What legitimately differs is voice and navigation, so this page passes
 * its own titles and hands `<Link>`s in as slots — the shared components must
 * stay router-free, because Lumen's tests render without one.
 *
 * **Composition matched to Lumen (2026-08-09).** This page briefly carried six
 * sections Lumen had dropped — the ask box, source coverage, the quadrant card,
 * the evidence block, the agree/pull-apart grid and the confidence badges. That
 * gap was a two-day accident of sequencing, not a decision, and it meant the two
 * routes onto the same portrait engine read as different products. Both now show
 * the same thing.
 *
 * The one piece of *journey* function that would otherwise have gone with the
 * source-coverage card is its "add what's missing" door back to Establish. That
 * is navigation, not a section, so it moves into the header rather than being
 * deleted — this page's job is to route onward, and Lumen's isn't.
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

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">What you&apos;re actually like</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Here&apos;s what we can see so far — how you tend to work, and what sits
          underneath that. It&apos;s a mirror to think with, not a verdict on you.
        </p>
        {/* The journey's door back to Establish. It used to hang off the
            source-coverage card; that card is gone, the door still matters. */}
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>Add what&apos;s missing</Link>
        </Button>
      </header>

      <SelfPortraitNarrative portrait={portrait} showAsk={false} />

      {!portrait.prism ? (
        <PortraitNoPrism title="No PRISM yet" headline={portrait.headline}>
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.DIRECTION_SETTING.ESTABLISH}>
              Request or upload PRISM
            </Link>
          </Button>
        </PortraitNoPrism>
      ) : (
        <PortraitDimensions
          prism={portrait.prism}
          title="What sits underneath that"
        />
      )}

      <PortraitCorroborating
        instruments={portrait.corroborating}
        title="The other instruments we read"
      />

      <PortraitAnchorNote />
    </div>
  )
}
