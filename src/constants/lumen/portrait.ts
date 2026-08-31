/**
 * Shared Self-Portrait presentation constants.
 *
 * These lived in duplicate — once in `pages/lumen/SelfPortrait.tsx` and once in
 * `pages/direction-setting/PortraitPage.tsx`. The copies had already begun to
 * drift: the two `SOURCE_ROWS` arrays carried different copy for three of their
 * four entries, and only one of them documented why. Extracting them means the
 * next change lands once instead of twice, and a divergence has to be argued
 * for rather than happening by omission.
 */
import { BEHAVIOUR_CONFIG } from "@/constants/prism"
import type {
  PortraitSourceKey,
  PrismDimensionKey,
  PrismQuadrant,
  PrismQuadrantScores,
} from "@/types/lumen"

export const QUADRANT_CLASS: Record<PrismQuadrant, string> = {
  Green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Blue: "bg-blue-100 text-blue-800 border-blue-200",
  Red: "bg-red-100 text-red-800 border-red-200",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
}

/**
 * Manual order, matching the licensed reference — not the frontend's older
 * BEHAVIOUR_CONFIG colouring, which rotated six of the eight dimensions until
 * 2026-08-01.
 */
export const QUADRANT_ROWS: {
  key: keyof PrismQuadrantScores
  label: PrismQuadrant
}[] = [
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "red", label: "Red" },
  { key: "gold", label: "Gold" },
]

export type PortraitSourceRow = {
  key: PortraitSourceKey
  label: string
  /**
   * Phrased as gain, never as deficiency: the reader may be out of work and
   * anxious, and a list of what they lack reads as a verdict. This is the
   * Direction-Setting wording, adopted as the shared default because it is the
   * one whose rationale was written down.
   */
  buys: string
}

export const SOURCE_ROWS: PortraitSourceRow[] = [
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

/**
 * The eight dimensions grouped under the quadrant each belongs to, so the
 * reader meets them as the components of the four rather than a rival set.
 *
 * Labels and colours come from `BEHAVIOUR_CONFIG` rather than being restated
 * here — it already pairs each dimension with its quadrant, and a second list
 * is a second thing to get wrong. Its `quadrant` index (1–4) maps to the
 * manual's Green / Blue / Red / Gold, which is the same pairing the backend
 * composer uses in `PRISM_QUADRANT_DIMENSIONS`.
 */
export const DIMENSION_GROUPS: {
  quadrant: PrismQuadrant
  dimensions: { key: PrismDimensionKey; label: string; color: string }[]
}[] = (["Green", "Blue", "Red", "Gold"] as PrismQuadrant[]).map(
  (quadrant, index) => ({
    quadrant,
    dimensions: Object.values(BEHAVIOUR_CONFIG)
      .filter((b) => b.quadrant === index + 1)
      .map((b) => ({
        key: b.label.toLowerCase() as PrismDimensionKey,
        label: b.label,
        color: b.color,
      })),
  })
)
