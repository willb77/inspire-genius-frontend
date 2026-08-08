import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import {
  PortraitAnchorNote,
  PortraitCorroborating,
  PortraitDimensions,
  PortraitNoPrism,
  PortraitSkeleton,
} from "@/components/lumen/portrait"
import { SelfPortraitNarrative } from "./SelfPortraitNarrative"

/**
 * "My Self-Portrait" — one coherent behavioral read across every instrument.
 *
 * Deliberately narrow (2026-08-08): the plain-language read, the eight
 * behavioural dimensions, and the instruments that corroborate them. The
 * question box, the source-coverage panel, the quadrant summary, the
 * own-words evidence block and the agree/pull-apart grid were all removed from
 * *this* page by request.
 *
 * None of that machinery was deleted — every one of those sections is still
 * rendered by the Direction-Setting Establish stage
 * (`pages/direction-setting/PortraitPage.tsx`), which shares these components
 * and is unchanged. The two pages now differ in composition as well as in voice
 * and navigation; edit one and you have not edited the other.
 *
 * The quadrant read survives the loss of `PortraitQuadrants`: `PortraitDimensions`
 * groups all eight dimensions under their quadrant colour, so Green/Blue/Red/Gold
 * are still on the page — with the constituent scores rather than just the mean.
 *
 * The backend is untouched and still returns `sources`, `evidence`,
 * `convergences`, `tensions` and the `/ask` route; the PDF/Word export continues
 * to carry all of it. This is a change to what one page shows, not to what
 * exists.
 *
 * This page has no router in its test tree, which is why nothing it renders may
 * import one.
 */
export default function SelfPortrait() {
  const { data: portrait, isLoading, isError } = useSelfPortrait()

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PortraitSkeleton />
      </div>
    )
  }

  if (isError || !portrait) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">We couldn't load your portrait</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Something went wrong composing your Self-Portrait. Try again in a moment.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">My Self-Portrait</h1>
        <p className="max-w-3xl text-muted-foreground">{portrait.headline}</p>
      </header>

      {/* Plain-language description + PDF/Word export. `showAsk={false}` drops
          the question box here only — Establish still carries it. */}
      <SelfPortraitNarrative portrait={portrait} showAsk={false} />

      {!portrait.prism ? (
        <PortraitNoPrism title="No PRISM profile yet" headline={portrait.headline} />
      ) : (
        <PortraitDimensions prism={portrait.prism} />
      )}

      <PortraitCorroborating
        instruments={portrait.corroborating}
        title="Corroborating instruments"
      />

      <PortraitAnchorNote />
    </div>
  )
}
