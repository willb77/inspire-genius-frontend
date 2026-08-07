/**
 * PRISM Radial Map — the real PRISM 8-Dimensional "wheel", rendered as
 * self-contained inline SVG, with the behavioural profile layers overlaid.
 *
 * This is the productionised replacement for the generic recharts spider
 * (`PrismBehavioralMap`): it reproduces PRISM's own circular map — four colour
 * quadrants (Gold top-left, Green top-right, Blue bottom-right, Red
 * bottom-left), eight behaviour spokes, grid rings at 35/65/75/100 — instead of
 * an off-the-shelf radar. Traced parametrically from the PRISM 'Professional'
 * report map; see `docs/prism/brain-map/` in the monorepo for the reference
 * generator.
 *
 * Layers follow the report KEY:
 *   Underlying = red solid · Adapted = purple dashed · Consistent = blue solid ·
 *   Blueprint  = green solid (benchmark, optional).
 *
 * Today the platform persists only the Underlying set, so `underlying` is the
 * one required layer and a single polygon renders. `adapted` / `consistent` /
 * `blueprint` are optional and light up automatically once that data is
 * captured — nothing else changes.
 *
 * The SVG uses no external fonts/images/CSS, so it survives the print/PDF
 * export path unchanged — matching the agent-engine's `prism_map.py` contract.
 */
import type { JSX } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BEHAVIOUR_CONFIG, QUADRANT_CONFIG } from "@/constants/prism"
import type {
  PrismDimension,
  PrismDimensionId,
  PrismQuadrantId,
} from "@/types/development"

/** One of the four profile layers PRISM overlays on the map. */
type LayerKey = "underlying" | "adapted" | "consistent" | "blueprint"

const LAYER_STYLE: Record<
  LayerKey,
  { label: string; stroke: string; dash?: string; width: number }
> = {
  underlying: { label: "Underlying", stroke: "#E53E3E", width: 2.6 },
  adapted: { label: "Adapted", stroke: "#7C3AED", dash: "8 5", width: 2.4 },
  consistent: { label: "Consistent", stroke: "#2B6CB0", width: 2.4 },
  blueprint: { label: "Blueprint", stroke: "#2F855A", width: 2.2 },
}

/** Quadrant rim colour (from the shared config) + a light centre for the fill gradient. */
const QUAD_FILL: Record<PrismQuadrantId, { rim: string; mid: string }> = {
  1: { rim: QUADRANT_CONFIG[1].color, mid: "#DFF3E6" }, // Green (top-right)
  2: { rim: QUADRANT_CONFIG[2].color, mid: "#DCEEFB" }, // Blue  (bottom-right)
  3: { rim: QUADRANT_CONFIG[3].color, mid: "#FBE0DF" }, // Red   (bottom-left)
  4: { rim: QUADRANT_CONFIG[4].color, mid: "#FBF3D3" }, // Gold  (top-left)
}

// Behaviour id → screen quadrant (matches the real map & BEHAVIOUR_CONFIG):
//   Green ids 1,2 → 0–90° (top-right)   Blue  ids 3,4 → 90–180° (bottom-right)
//   Red   ids 5,6 → 180–270° (bottom-left) Gold ids 7,8 → 270–360° (top-left)
const QUAD_SPAN: Record<PrismQuadrantId, [number, number]> = {
  1: [0, 90],
  2: [90, 180],
  3: [180, 270],
  4: [270, 360],
}

const IDS: PrismDimensionId[] = [1, 2, 3, 4, 5, 6, 7, 8]
const RINGS = [35, 65, 75, 100] as const

const CX = 280
const CY = 280
const R = 210

/** Behaviour id → angle (deg, clockwise from 12 o'clock). Two per 90° quadrant. */
function angleFor(id: PrismDimensionId): number {
  return (id - 1) * 45 + 22.5
}

function point(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  return [CX + radius * Math.sin(a), CY - radius * Math.cos(a)]
}

function wedgePath(span: [number, number]): string {
  const [x0, y0] = point(span[0], R)
  const [x1, y1] = point(span[1], R)
  return `M ${CX} ${CY} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`
}

/** Score keyed by behaviour id for one layer, for O(1) polygon lookup. */
function byId(dims: PrismDimension[] | undefined): Map<PrismDimensionId, number> {
  const m = new Map<PrismDimensionId, number>()
  for (const d of dims ?? []) m.set(d.id, d.score)
  return m
}

function polygon(
  scores: Map<PrismDimensionId, number>,
  style: (typeof LAYER_STYLE)[LayerKey],
): JSX.Element[] {
  const pts: string[] = []
  const dots: JSX.Element[] = []
  for (const id of IDS) {
    const raw = scores.get(id) ?? 0
    const v = Math.max(0, Math.min(raw, 100))
    const [x, y] = point(angleFor(id), (R * v) / 100)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    dots.push(
      <circle key={`${style.label}-${id}`} cx={x} cy={y} r={3.2} fill={style.stroke} />,
    )
  }
  return [
    <polygon
      key={`${style.label}-poly`}
      points={pts.join(" ")}
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.width}
      strokeDasharray={style.dash}
      strokeLinejoin="round"
    />,
    ...dots,
  ]
}

export type PrismRadialMapProps = {
  /** The primary (Underlying) layer — the 8 behaviours, score 0–100. Required. */
  underlying: PrismDimension[]
  /** Optional overlays; render automatically when supplied. */
  adapted?: PrismDimension[]
  consistent?: PrismDimension[]
  blueprint?: PrismDimension[]
}

/**
 * The radar polygons draw back-to-front so the Underlying layer sits on top
 * (it is the one users read first and the one always present).
 */
const DRAW_ORDER: LayerKey[] = ["blueprint", "consistent", "adapted", "underlying"]

export function PrismRadialMap({
  underlying,
  adapted,
  consistent,
  blueprint,
}: PrismRadialMapProps): JSX.Element {
  const layers: Record<LayerKey, PrismDimension[] | undefined> = {
    underlying,
    adapted,
    consistent,
    blueprint,
  }
  const present = DRAW_ORDER.filter((k) => (layers[k]?.length ?? 0) > 0)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="w-full" data-testid="prism-radial-map">
        <svg
          viewBox="0 0 560 600"
          width="100%"
          role="img"
          aria-label="PRISM behavioral map — radial wheel with your profile plotted across the eight behaviours."
        >
          <defs>
            {IDS.filter((id) => id % 2 === 1).map((id) => {
              const q = BEHAVIOUR_CONFIG[id].quadrant as PrismQuadrantId
              const { rim, mid } = QUAD_FILL[q]
              return (
                <radialGradient id={`prism-quad-${q}`} key={q} cx="50%" cy="50%" r="75%">
                  <stop offset="0%" stopColor={mid} />
                  <stop offset="100%" stopColor={rim} />
                </radialGradient>
              )
            })}
          </defs>

          {/* Colour quadrant wedges */}
          {(Object.keys(QUAD_SPAN) as unknown as PrismQuadrantId[]).map((q) => (
            <path key={`wedge-${q}`} d={wedgePath(QUAD_SPAN[q])} fill={`url(#prism-quad-${q})`} />
          ))}

          {/* Quadrant boundary axes (white) */}
          {[0, 90, 180, 270].map((a) => {
            const [x, y] = point(a, R)
            return (
              <line key={`axis-${a}`} x1={CX} y1={CY} x2={x} y2={y} stroke="#FFFFFF" strokeWidth={2} />
            )
          })}

          {/* Grid rings + labels */}
          {RINGS.map((ring) => {
            const rr = (R * ring) / 100
            const solid = ring === 100
            return (
              <g key={`ring-${ring}`}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={rr}
                  fill="none"
                  stroke={solid ? "#8A94A6" : "#4A5568"}
                  strokeWidth={1}
                  strokeDasharray={solid ? undefined : "4 4"}
                  opacity={0.7}
                />
                {!solid && (
                  <text x={CX + 4} y={CY - rr + 4} fontSize={11} fill="#2D3748">
                    {ring}
                  </text>
                )}
              </g>
            )
          })}

          {/* Behaviour labels just outside the rim */}
          {IDS.map((id) => {
            const [lx, ly] = point(angleFor(id), R + 22)
            const anchor = lx < CX - 12 ? "end" : lx > CX + 12 ? "start" : "middle"
            return (
              <text
                key={`label-${id}`}
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize={13}
                fill="#1A202C"
              >
                {BEHAVIOUR_CONFIG[id].label}
              </text>
            )
          })}

          {/* Profile layer polygons (back-to-front) */}
          {present.map((k) => (
            <g key={`layer-${k}`}>{polygon(byId(layers[k]), LAYER_STYLE[k])}</g>
          ))}

          {/* KEY — only the layers actually present, in reading order */}
          {present
            .slice()
            .reverse()
            .map((k, i) => {
              const s = LAYER_STYLE[k]
              return (
                <g key={`key-${k}`} transform={`translate(${20 + i * 135}, 588)`}>
                  <line
                    x1={0}
                    y1={-4}
                    x2={26}
                    y2={-4}
                    stroke={s.stroke}
                    strokeWidth={3}
                    strokeDasharray={s.dash}
                  />
                  <text x={32} y={0} fontSize={12} fill={s.stroke}>
                    {s.label}
                  </text>
                </g>
              )
            })}
        </svg>
      </div>

      {/* Accessible score table — the text equivalent of the wheel. Columns
          expand to whatever layers were supplied (today: Underlying only). */}
      <Table>
        <caption className="sr-only">
          PRISM 8-dimension scores (text equivalent of the radial map).
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>Dimension</TableHead>
            <TableHead>Quadrant</TableHead>
            {present.map((k) => (
              <TableHead key={`h-${k}`} className="text-right">
                {LAYER_STYLE[k].label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {IDS.map((id) => {
            const q = BEHAVIOUR_CONFIG[id].quadrant as PrismQuadrantId
            const scoreMaps = present.map((k) => byId(layers[k]))
            return (
              <TableRow key={id}>
                <TableCell className="font-medium">{BEHAVIOUR_CONFIG[id].label}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: QUADRANT_CONFIG[q].color }}
                      aria-hidden="true"
                    />
                    {QUADRANT_CONFIG[q].label}
                  </span>
                </TableCell>
                {present.map((k, ci) => {
                  const v = scoreMaps[ci].get(id)
                  return (
                    <TableCell key={`c-${k}-${id}`} className="text-right tabular-nums">
                      {v ?? "—"}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default PrismRadialMap
