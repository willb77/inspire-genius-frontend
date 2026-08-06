import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { SelfPortraitNarrative } from "./SelfPortraitNarrative"

/**
 * "My Self-Portrait" — one coherent behavioral read across every instrument.
 *
 * PRISM leads visually because it leads substantively: it is the anchor the
 * backend reconciles everything else against. Corroborating instruments are
 * ordered most-trustworthy first, and tensions are shown rather than smoothed
 * over — a disagreement between instruments is usually the interesting part.
 *
 * The page also states **what it is built from** — PRISM, other assessments,
 * résumé, bio — including the ones you don't have. Showing the gaps is the
 * point: a portrait resting on a résumé alone is a real portrait, but the reader
 * deserves to know that's what they're looking at, and what would sharpen it.
 *
 * Every section below is shared with the Direction-Setting Establish stage
 * (`pages/direction-setting/PortraitPage.tsx`). What differs between the two is
 * voice and navigation, so those arrive as props — see `components/lumen/
 * portrait`. This page has no router in its test tree, which is why nothing it
 * renders may import one.
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

      {/* Plain-language description + "ask your portrait" + PDF/Word export,
          above the source list per the page's top-down read. */}
      <SelfPortraitNarrative portrait={portrait} />

      {/* Guarded, not defaulted: a backend predating the four-source composer
          sends no `sources` at all, and an all-false panel would report every
          source missing rather than admitting it doesn't know. */}
      {portrait.sources && (
        <PortraitSourceCoverage
          sources={portrait.sources}
          coverage={portrait.coverage}
        />
      )}

      {!portrait.prism ? (
        <PortraitNoPrism title="No PRISM profile yet" headline={portrait.headline} />
      ) : (
        <>
          <PortraitQuadrants prism={portrait.prism} title="PRISM" />
          <PortraitDimensions prism={portrait.prism} />
        </>
      )}

      <PortraitEvidence
        evidence={portrait.evidence ?? []}
        note={portrait.evidence_note}
      />

      <PortraitCorroborating
        instruments={portrait.corroborating}
        title="Corroborating instruments"
      />

      <PortraitAgreementGrid
        convergences={portrait.convergences}
        tensions={portrait.tensions}
        convergenceTitle="Where your instruments agree"
        convergenceEmpty="Nothing to corroborate yet — a second instrument would give us this."
      />

      <PortraitAnchorNote />
    </div>
  )
}
