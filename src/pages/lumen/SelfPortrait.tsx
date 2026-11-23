import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import { ProvenanceNote } from "@/components/shared/ProvenanceNote"
import {
  PortraitAnchorNote,
  PortraitCorroborating,
  PortraitNoPrism,
  PortraitSkeleton,
} from "@/components/lumen/portrait"
import { PrismRadialMap } from "@/components/prism/PrismRadialMap"
import { BEHAVIOUR_CONFIG } from "@/constants/prism"
import type { PrismDimension, PrismDimensionId, PrismQuadrantId } from "@/types/development"
import type { PrismAnchor, PrismDimensionKey } from "@/types/lumen"
import { SelfPortraitNarrative } from "./SelfPortraitNarrative"

const DIMENSION_IDS: Record<PrismDimensionKey, PrismDimensionId> = {
  innovating: 1,
  initiating: 2,
  supporting: 3,
  coordinating: 4,
  focusing: 5,
  delivering: 6,
  finishing: 7,
  evaluating: 8,
}

/** Anchor dimensions -> the wheel's layer shape, labels/quadrants from BEHAVIOUR_CONFIG. */
function toWheelLayer(prism: PrismAnchor): PrismDimension[] {
  const out: PrismDimension[] = []
  for (const [key, id] of Object.entries(DIMENSION_IDS) as [PrismDimensionKey, PrismDimensionId][]) {
    const score = prism.dimensions?.[key]
    if (score === undefined) continue
    out.push({
      id,
      label: BEHAVIOUR_CONFIG[id].label,
      score,
      quadrant: BEHAVIOUR_CONFIG[id].quadrant as PrismQuadrantId,
    })
  }
  return out
}

/**
 * "My Self-Portrait" — one coherent behavioral read across every instrument.
 *
 * Deliberately narrow (2026-08-08): the plain-language read, the PRISM Brain
 * Map, and the instruments that corroborate them. The
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
 * Composition: header, then the Brain Map (`PrismRadialMap`, compact, capped
 * by viewport height so the map and the start of "In plain language" share one
 * screen), then the narrative. The map is fed from `portrait.prism.dimensions`,
 * the same data the bar chart used, so map and text cannot disagree. The four
 * quadrant colours are the wheel's own wedges; the eight scores stay available
 * to assistive tech through the wheel's sr-only table. `PortraitDimensions`
 * (the bar chart) is no longer rendered here, but is unchanged and still used
 * by Establish and Career Discovery. The Introversion/Extroversion spectrum it
 * showed is not on this page.
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
  const { t } = useTranslation("lumenPages")
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
            <CardTitle className="text-base">{t("portraitLoadErrorTitle", "We couldn't load your portrait")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("portraitLoadErrorBody", "Something went wrong composing your Self-Portrait. Try again in a moment.")}
          </CardContent>
        </Card>
      </div>
    )
  }

  const wheel = portrait.prism ? toWheelLayer(portrait.prism) : []

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("portraitTitle", "My Self-Portrait")}</h1>
        <p className="max-w-3xl text-muted-foreground">{portrait.headline}</p>
        {/* Provenance, shown ALWAYS — see ProvenanceNote. Rendering it only
            when PRISM is absent would make its presence the message. */}
        <ProvenanceNote sources={portrait.sources ?? {}} className="max-w-3xl" />
      </header>

      {wheel.length > 0 && (
        <div>
          <PrismRadialMap underlying={wheel} compact />
        </div>
      )}

      {/* Plain-language description + PDF/Word export. `showAsk={false}` drops
          the question box here only — Establish still carries it. */}
      <SelfPortraitNarrative portrait={portrait} showAsk={false} />

      {!portrait.prism ? (
        <PortraitNoPrism
          title={t("portraitBuiltOn", "What this is built on so far")}
          headline={portrait.headline}
        />
      ) : null}

      <PortraitCorroborating
        instruments={portrait.corroborating}
        title={t("portraitCorroborating", "Corroborating instruments")}
      />

      <PortraitAnchorNote />
    </div>
  )
}
