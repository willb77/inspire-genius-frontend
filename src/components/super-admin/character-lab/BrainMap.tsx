import { QUADRANT_CONFIG } from "@/constants/prism"
import { QUADRANT_MEANING } from "@/lib/exportCharacterProfile"
import type { DerivedQuadrant } from "@/types/character-lab"

/**
 * The four-colour brain map, laid out as PRISM's own quadrants.
 *
 * Gold top-left, Green top-right, Red bottom-left, Blue bottom-right — the
 * canonical arrangement. Every tile prints WHAT THE PAIRING MEASURES under the
 * colour name, because the names are the trap: read as ordinary English, Gold
 * suggests discipline and Green suggests patience, and the actual pairings
 * (Finishing+Evaluating, Innovating+Initiating) are not recoverable from them.
 *
 * Values are derived server-side from the eight behaviour scores by
 * `prism_canon.derive_colours`. Nothing here computes a colour.
 */
const LAYOUT: Array<'Gold' | 'Green' | 'Red' | 'Blue'> = ["Gold", "Green", "Red", "Blue"]

const CONFIG_BY_NAME = Object.fromEntries(
  Object.values(QUADRANT_CONFIG).map((c) => [c.label, c]),
) as Record<string, { label: string; color: string; bgClass: string }>

export default function BrainMap({ quadrants }: { quadrants: DerivedQuadrant[] }) {
  if (!quadrants.length) return null
  const byName = Object.fromEntries(quadrants.map((q) => [q.name, q]))
  const top = Math.max(...quadrants.map((q) => q.value))

  return (
    // A list, not four divs: the quadrants are four peers of one set, and it
    // gives assistive tech (and tests) a handle on each tile as a unit.
    <ul className="grid grid-cols-2 gap-3">
      {LAYOUT.map((name) => {
        const q = byName[name]
        const config = CONFIG_BY_NAME[name]
        if (!q || !config) return <li key={name} aria-hidden />
        const dominant = q.value === top
        return (
          <li
            key={name}
            className="relative overflow-hidden rounded-lg border p-4"
            style={{
              borderColor: config.color,
              background: `linear-gradient(135deg, ${config.color}1f, transparent 70%)`,
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold" style={{ color: config.color }}>
                {name}
              </span>
              <span className="text-2xl font-bold tabular-nums">{q.value}</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {QUADRANT_MEANING[name]}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${q.value}%`, backgroundColor: config.color }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {q.band}
              {dominant && <span className="ml-1 font-semibold">· dominant</span>}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
