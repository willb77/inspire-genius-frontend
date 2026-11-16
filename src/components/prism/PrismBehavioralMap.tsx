/**
 * Standalone PRISM behavioral map — the recharts radar + accessible score table.
 *
 * Extracted from the Team Development Studio's BehavioralProfilePanel (the map
 * the manager sees on a member's card) so it can be reused on HomeV2 for the
 * user's OWN behavioral map. Renders `quadrant`/`label` exactly as provided, so
 * it matches the dossier's grouping wherever the data comes from.
 */
import { useTranslation } from "react-i18next"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BEHAVIOUR_CONFIG, QUADRANT_CONFIG } from "@/constants/prism"
import type { PrismDimension, PrismQuadrantId } from "@/types/development"

function quadrantColor(q: PrismQuadrantId): string {
  return QUADRANT_CONFIG[q]?.color ?? "#64748b"
}

export type PrismBehavioralMapProps = {
  prism: PrismDimension[]
  /** Radar stroke/fill colour. Defaults to the HomeV2 accent. */
  brandHex?: string
}

export function PrismBehavioralMap({ prism, brandHex = "#E8932B" }: PrismBehavioralMapProps) {
  const { t } = useTranslation("prismUi")
  const radarData = prism.map((d) => ({
    dimension: d.label || BEHAVIOUR_CONFIG[d.id]?.label || t("behavioralMap.dimFallback", { defaultValue: "Dim {{id}}", id: d.id }),
    score: d.score,
    quadrant: d.quadrant,
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-72 w-full" data-testid="prism-radar">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Radar
              name="PRISM"
              dataKey="score"
              stroke={brandHex}
              fill={brandHex}
              fillOpacity={0.25}
              dot={(props: { cx?: number; cy?: number; payload?: { quadrant?: PrismQuadrantId } }) => {
                const q = props.payload?.quadrant ?? 1
                return (
                  <circle
                    key={`${props.cx}-${props.cy}`}
                    cx={props.cx}
                    cy={props.cy}
                    r={3.5}
                    fill={quadrantColor(q as PrismQuadrantId)}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <Table>
        <caption className="sr-only">
          {t("behavioralMap.tableCaption", { defaultValue: "PRISM 8-dimension scores (text equivalent of the radar chart)." })}
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>{t("behavioralMap.colDimension", { defaultValue: "Dimension" })}</TableHead>
            <TableHead>{t("behavioralMap.colQuadrant", { defaultValue: "Quadrant" })}</TableHead>
            <TableHead className="text-right">{t("behavioralMap.colScore", { defaultValue: "Score" })}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prism.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">
                {d.label || BEHAVIOUR_CONFIG[d.id]?.label}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: quadrantColor(d.quadrant) }}
                    aria-hidden="true"
                  />
                  {QUADRANT_CONFIG[d.quadrant]?.label}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{d.score}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default PrismBehavioralMap
